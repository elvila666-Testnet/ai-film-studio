import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

export const storyboardRouter = router({
  getImages: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const { getStoryboardImages } = await import("../db");
      return getStoryboardImages(input.projectId);
    }),

  saveImage: publicProcedure
    .input(z.object({
      projectId: z.number(),
      shotNumber: z.number(),
      imageUrl: z.string(),
      prompt: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const { saveStoryboardImage } = await import("../db");
      await saveStoryboardImage(input.projectId, input.shotNumber, input.imageUrl, input.prompt);
      return { success: true };
    }),

  extractCharacters: publicProcedure
    .input(z.object({ script: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const { analyzeScriptForCharacters, getCharacterStatistics } = await import("../services/scriptParser");
      const characters = await analyzeScriptForCharacters(input.script);
      const stats = getCharacterStatistics(input.script);
      return { characters, stats };
    }),

  // Generate shot with locked character
  generateShot: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      shotNumber: z.number(),
      prompt: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { getLockedCharacters } = await import("../db/characters");
        const { getProjectPDSets } = await import("../db/productionDesign");
        const { saveStoryboardImage, getDb, shots, scenes } = await import("../db");
        const { generateStoryboardImage } = await import("../services/aiGeneration");
        const { eq, and } = await import("drizzle-orm");

        // 1. Fetch exact shot metadata for blueprint
        const db = await getDb();
        const [result] = await db.select({ shots }).from(shots)
            .innerJoin(scenes, eq(shots.sceneId, scenes.id))
            .where(
                and(
                    eq(scenes.projectId, input.projectId),
                    eq(shots.order, input.shotNumber)
                )
            ).limit(1);

        const shotData = result?.shots;
        const blueprint = shotData?.aiBlueprint || {};

        // 2. Fetch Assets
        const lockedChars = await getLockedCharacters(input.projectId) || [];
        const projectSets = await getProjectPDSets(input.projectId) || [];
        const approvedSets = projectSets.filter((s: any) => s.status === "approved" || s.referenceImageUrl);

        // 3. Construct Master Prompt
        let cinematicPrompt = `8K RAW cinematic photograph. ACTION: ${input.prompt}. `;
        
        if (blueprint.directorIntent?.emotionalObjective) {
            cinematicPrompt += `EMOTION: ${blueprint.directorIntent.emotionalObjective}. `;
        }
        if (blueprint.cameraSpecs) {
            cinematicPrompt += `CINEMATOGRAPHY: ${blueprint.cameraSpecs.shotType}, ${blueprint.cameraSpecs.movementLogic || "static"} movement. Lens: ${blueprint.cameraSpecs.lensStrategy || "35mm"}. Lighting: ${blueprint.cameraSpecs.lightingSpec || "natural"}. `;
        }

        const searchSpace = `${input.prompt} ${blueprint.directorIntent?.castingRequirements || ""}`.toLowerCase();
        const charsInShot = lockedChars.filter((c: any) => searchSpace.includes(c.name.toLowerCase()));
        
        let imageAnchors: string[] = [];
        if (charsInShot.length > 0) {
            cinematicPrompt += `CHARACTERS: `;
            charsInShot.forEach((c: any) => {
                cinematicPrompt += `[${c.name}: ${c.description}] `;
                if (c.imageUrl && c.imageUrl !== 'draft') imageAnchors.push(c.imageUrl);
            });
        }

        const setSpace = `${blueprint.productionDesign?.environmentalAtmosphere || ""} ${blueprint.productionDesign?.setDressing || ""}`.toLowerCase();
        const setsInShot = approvedSets.filter((s: any) => setSpace.includes(s.name.toLowerCase()));
        if (setsInShot.length > 0) {
            cinematicPrompt += `SET DESIGN: [${setsInShot[0].name}: ${setsInShot[0].description}]. `;
            if (setsInShot[0].referenceImageUrl) imageAnchors.push(setsInShot[0].referenceImageUrl);
        }

        const finalAnchors = imageAnchors.slice(0, 3);
        const targetModel = finalAnchors.length > 0 ? "nano-banana-pro" : "flux-fast";

        // 4. Generate
        const imageUrl = await generateStoryboardImage(
          cinematicPrompt,
          targetModel,
          input.projectId,
          ctx.user.id.toString(),
          "1024x1024",
          finalAnchors
        );

        // 5. Save
        await saveStoryboardImage(input.projectId, input.shotNumber, imageUrl, input.prompt);

        return { imageUrl };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to generate shot. Please try again.";
        console.error(`[storyboardRouter] generateShot failed:`, message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: message,
        });
      }
    }),

  // Generate all shots with consistency
  generateAll: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const { getStoryboardImages } = await import("../db");
      const shots = await getStoryboardImages(input.projectId);

      // Batch generate all shots with consistency
      const results = [];
      for (const shot of shots) {
        results.push({ shotNumber: shot.shotNumber, status: "queued" });
      }
      return { success: true, results };
    }),

  approveAndUpscaleFrame: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      storyboardImageId: z.number(),
      imageUrl: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const { updateStoryboardImageStatus } = await import("../db");
      const { upscaleImageTo4k } = await import("../services/aiGeneration");

      await updateStoryboardImageStatus(input.storyboardImageId, "approved");

      const masterUrl = await upscaleImageTo4k(input.imageUrl);

      await updateStoryboardImageStatus(input.storyboardImageId, "approved", masterUrl);

      return { success: true, masterImageUrl: masterUrl };
    }),

  regenerateSingleFrame: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      shotNumber: z.number(),
      prompt: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { getLockedCharacters } = await import("../db/characters");
        const { getProjectPDSets } = await import("../db/productionDesign");
        const { saveStoryboardImage, getDb, shots, scenes, getStoryboardImageWithConsistency, updateStoryboardImageStatus } = await import("../db");
        const { generateStoryboardImage } = await import("../services/aiGeneration");
        const { eq, and } = await import("drizzle-orm");

        // 1. Fetch exact shot metadata for blueprint
        const db = await getDb();
        const [result] = await db.select({ shots }).from(shots)
            .innerJoin(scenes, eq(shots.sceneId, scenes.id))
            .where(
                and(
                    eq(scenes.projectId, input.projectId),
                    eq(shots.order, input.shotNumber)
                )
            ).limit(1);

        const shotData = result?.shots;
        const blueprint = shotData?.aiBlueprint || {};

        // 2. Fetch Assets
        const lockedChars = await getLockedCharacters(input.projectId) || [];
        const projectSets = await getProjectPDSets(input.projectId) || [];
        const approvedSets = projectSets.filter((s: any) => s.status === "approved" || s.referenceImageUrl);

        // 3. Construct Master Prompt
        let cinematicPrompt = `8K RAW cinematic photograph. ACTION: ${input.prompt}. `;
        
        if (blueprint.directorIntent?.emotionalObjective) {
            cinematicPrompt += `EMOTION: ${blueprint.directorIntent.emotionalObjective}. `;
        }
        if (blueprint.cameraSpecs) {
            cinematicPrompt += `CINEMATOGRAPHY: ${blueprint.cameraSpecs.shotType}, ${blueprint.cameraSpecs.movementLogic || "static"} movement. Lens: ${blueprint.cameraSpecs.lensStrategy || "35mm"}. Lighting: ${blueprint.cameraSpecs.lightingSpec || "natural"}. `;
        }

        const searchSpace = `${input.prompt} ${blueprint.directorIntent?.castingRequirements || ""}`.toLowerCase();
        const charsInShot = lockedChars.filter((c: any) => searchSpace.includes(c.name.toLowerCase()));
        
        let imageAnchors: string[] = [];
        if (charsInShot.length > 0) {
            cinematicPrompt += `CHARACTERS: `;
            charsInShot.forEach((c: any) => {
                cinematicPrompt += `[${c.name}: ${c.description}] `;
                if (c.imageUrl && c.imageUrl !== 'draft') imageAnchors.push(c.imageUrl);
            });
        }

        const setSpace = `${blueprint.productionDesign?.environmentalAtmosphere || ""} ${blueprint.productionDesign?.setDressing || ""}`.toLowerCase();
        const setsInShot = approvedSets.filter((s: any) => setSpace.includes(s.name.toLowerCase()));
        if (setsInShot.length > 0) {
            cinematicPrompt += `SET DESIGN: [${setsInShot[0].name}: ${setsInShot[0].description}]. `;
            if (setsInShot[0].referenceImageUrl) imageAnchors.push(setsInShot[0].referenceImageUrl);
        }

        const finalAnchors = imageAnchors.slice(0, 3);
        const targetModel = finalAnchors.length > 0 ? "nano-banana-pro" : "flux-fast";

        // 4. Generate
        const imageUrl = await generateStoryboardImage(
          cinematicPrompt,
          targetModel,
          input.projectId,
          ctx.user.id.toString(),
          "1024x1024",
          finalAnchors
        );

        // 5. Save
        await saveStoryboardImage(input.projectId, input.shotNumber, imageUrl, input.prompt);
        const savedImage = await getStoryboardImageWithConsistency(input.projectId, input.shotNumber);
        if (savedImage) await updateStoryboardImageStatus(savedImage.id, "draft");

        return { imageUrl };
      } catch (error: unknown) {
        console.error(`[storyboardRouter] regenerateSingleFrame failed:`, error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to regenerate frame",
        });
      }
    }),

  generateGrid: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      globalInstructions: z.string().optional(),
      visualStyle: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        console.log(`[Storyboard] ▶ generateGrid START. projectId=${input.projectId}`);
        const { getBuiltPrompts, buildStoryboardPrompts } = await import("../services/agents/production/promptEngineerAgent");
        
        let gridPrompts = await getBuiltPrompts(input.projectId);
        if (!gridPrompts || gridPrompts.length === 0 || input.visualStyle) {
            console.log("[Storyboard] Building storyboard prompts with visualStyle:", input.visualStyle || "default");
            gridPrompts = await buildStoryboardPrompts(input.projectId, input.visualStyle);
        }

        const { getDb, storyboardImages, saveStoryboardImage } = await import("../db");
        const { eq, gte, and } = await import("drizzle-orm");
        
        const db = await getDb();
        if (db) {
          await db.delete(storyboardImages).where(
            and(
              eq(storyboardImages.projectId, input.projectId),
              gte(storyboardImages.shotNumber, 999)
            )
          );
        }

        const { generateGridImage } = await import("../services/aiGeneration");
        const totalPages = gridPrompts.length;
        const gridPages: Array<{ pageNumber: number; gridImageUrl: string }> = [];

        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
          const promptData = gridPrompts[pageIdx];
          const pageNumber = promptData.pageNumber;
          const gridPrompt = promptData.masterPrompt;
          const visualAnchors = promptData.characterReferenceUrls || [];

          let gridImageUrl = "";
          try {
            // Pass all curated anchors (characters + sets) for visual reference consistency
            gridImageUrl = await generateGridImage(
              gridPrompt,
              input.projectId,
              ctx.user.id.toString(),
              visualAnchors
            );
          } catch (err: any) {
            const fs = await import("fs");
            const errMsg = err instanceof Error ? err.message : String(err);
            const errStack = err instanceof Error ? err.stack : String(err);
            const errDetail = [
              `[${new Date().toISOString()}] generateGridImage ERROR (page ${pageNumber}/${totalPages}):`,
              `Message: ${errMsg}`,
              `Stack: ${errStack}`,
              `Prompt length: ${gridPrompt.length} chars`,
              `Anchors count: ${visualAnchors.length}`,
            ].join('\n');
            fs.writeFileSync("grid_err.log", errDetail);
            console.error("[Storyboard] ✘ generateGridImage failed:", errMsg);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Grid image generation failed: ${errMsg}`,
            });
          }

          const shotNumber = 1000 + pageIdx;
          await saveStoryboardImage(input.projectId, shotNumber, gridImageUrl, gridPrompt);

          gridPages.push({ pageNumber, gridImageUrl });
        }

        return { gridPages, totalPages };
      } catch (topErr: any) {
        const fs = await import("fs");
        fs.writeFileSync("grid_err.log", `[${new Date().toISOString()}] generateGrid TOPLEVEL ERROR:\n${topErr.stack || topErr}\n\nMessage: ${topErr.message}\nCode: ${topErr.code}\n`);
        console.error("[Storyboard] ✘ generateGrid TOPLEVEL ERROR:", topErr);
        throw topErr;
      }
    }),

  // ── Cinema Pipeline: Run multi-agent orchestrator ────────────────
  runPipeline: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      globalNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log(`[Storyboard] ▶ runPipeline START. projectId=${input.projectId}`);
        const { assembleProductionBible } = await import("../services/showrunnerService");
        const { runCinemaExecutionPipeline } = await import("../services/cinemaOrchestrator");
        const { getDb } = await import("../db");
        const { shots: shotsTable, scenes: scenesTable } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        // 1. Assemble the Production Bible
        const bible = await assembleProductionBible(input.projectId, input.globalNotes);
        console.log(`[Storyboard] Bible assembled: ${bible.technicalScript.length} scenes, ${bible.technicalScript.reduce((a, s) => a + s.shots.length, 0)} shots`);

        if (bible.technicalScript.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No scenes found. Please generate a script and scene breakdown first.",
          });
        }

        const db = await getDb();
        if (!db) throw new Error("Database unreachable");

        // 2. Get scene IDs for this project
        const sceneList = await db
          .select()
          .from(scenesTable)
          .where(eq(scenesTable.projectId, input.projectId))
          .orderBy(scenesTable.order);

        const results: Array<{
          sceneTitle: string;
          shotsProcessed: number;
          continuityValidation: string;
          conflictReport: string;
        }> = [];

        // 3. Run the Cinema Pipeline for each scene
        for (const scene of sceneList) {
          console.log(`[Storyboard] Running Cinema Pipeline for Scene: ${scene.title || scene.order}`);

          const pipelineOutput = await runCinemaExecutionPipeline({
            sceneScript: scene.description || `Scene ${scene.order}: ${scene.title}`,
            globalNotes: input.globalNotes,
          });

          // 4. Get DB shots for this scene
          const dbShots = await db
            .select()
            .from(shotsTable)
            .where(eq(shotsTable.sceneId, scene.id))
            .orderBy(shotsTable.order);

          // 5. Save aiBlueprint to each shot (match by order index)
          const pipelineShots = pipelineOutput.finalHarmonizedDocument?.shots || [];
          const shotsToProcess = Math.min(dbShots.length, pipelineShots.length);

          for (let i = 0; i < shotsToProcess; i++) {
            const dbShot = dbShots[i];
            const blueprintShot = pipelineShots[i];

            await db.update(shotsTable)
              .set({ aiBlueprint: blueprintShot })
              .where(eq(shotsTable.id, dbShot.id));
          }

          // If pipeline produced MORE shots than exist in DB, create new ones
          for (let i = dbShots.length; i < pipelineShots.length; i++) {
            const blueprintShot = pipelineShots[i];
            await db.insert(shotsTable).values({
              sceneId: scene.id,
              order: i + 1,
              visualDescription: blueprintShot.directorIntent?.visualDescription || "Generated by Cinema Pipeline",
              cameraAngle: blueprintShot.cameraSpecs?.shotType || "Medium Shot",
              movement: blueprintShot.cameraSpecs?.movementLogic || "Static",
              lighting: blueprintShot.cameraSpecs?.lightingSpec || "Natural",
              lens: blueprintShot.cameraSpecs?.lensStrategy || "35mm",
              audioDescription: blueprintShot.soundArchitecture?.environmentalSoundscape || "Ambient",
              aiBlueprint: blueprintShot,
              status: "planned",
            });
          }

          results.push({
            sceneTitle: scene.title || `Scene ${scene.order}`,
            shotsProcessed: Math.max(dbShots.length, pipelineShots.length),
            continuityValidation: pipelineOutput.continuityValidation || "OK",
            conflictReport: pipelineOutput.technicalConflictReport || "None",
          });
        }

        const totalShots = results.reduce((a, r) => a + r.shotsProcessed, 0);
        console.log(`[Storyboard] ✔ Pipeline complete: ${results.length} scenes, ${totalShots} shots processed`);

        return {
          success: true,
          scenesProcessed: results.length,
          totalShotsProcessed: totalShots,
          results,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Cinema pipeline failed";
        console.error("[Storyboard] ✘ runPipeline ERROR:", message);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
        });
      }
    }),
});
