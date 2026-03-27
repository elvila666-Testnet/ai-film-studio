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
    
  getShotsWithState: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const { getShotsWithState } = await import("../db/storyboard");
      return getShotsWithState(input.projectId);
    }),

  bulkMaterialize: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { getShotsWithState } = await import("../db/storyboard");
      const { generateStoryboardImage } = await import("../services/aiGeneration");
      const { saveStoryboardImage } = await import("../db/storyboard");
      const { getDb } = await import("../db");
      const { storyboardImages: sbTable } = await import("../../drizzle/schema");
      const { eq, and, gte } = await import("drizzle-orm");
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const allShots = await getShotsWithState(input.projectId) as any[];
      const missingShots = allShots.filter((s: any) => !s.imageUrl);
      
      // Fetch grids once for bulk operation
      const grids = await db.select().from(sbTable).where(
        and(
          eq(sbTable.projectId, input.projectId),
          gte(sbTable.shotNumber, 1000)
        )
      ).orderBy(sbTable.shotNumber);

      console.log(`[BulkMaterialize] Processing ${missingShots.length} shots for project ${input.projectId} using ${grids.length} grid pages as anchors.`);
      
      const results = await Promise.allSettled(missingShots.map(async (shot: any) => {
        try {
          const pageIdx = Math.floor((shot.shotNumber - 1) / 12);
          const gridForShot = grids[pageIdx];
          
          let visualAnchors: string[] = [];
          let identityInstruction = "";
          
          if (gridForShot) {
              const { cropGridTile } = await import("../services/imageProcessing");
              const localIdx = (shot.shotNumber - 1) % 12;
              const row = Math.floor(localIdx / 3) + 1;
              const col = (row === 2) ? 3 - (localIdx % 3) : (localIdx % 3) + 1;
              
              try {
                  const croppedTileUrl = await cropGridTile(gridForShot.imageUrl, row, col);
                  visualAnchors.push(croppedTileUrl);
                  identityInstruction = `IDENTITY_LOCK MANDATE: RENDER frame #${shot.shotNumber} from the provided reference. This is a PIXEL-STRICT UPSCALE. Match 100% composition, camera angle, and subject pose. Remove all grid lines and burnins. NO VARIATIONS. `;
              } catch (cropErr) {
                  console.warn("[BulkMaterialize] Tile crop failed, falling back to full grid:", cropErr);
                  visualAnchors.push(gridForShot.imageUrl);
                  identityInstruction = `MATCH-IDENTITY MANDATE: Replicate Tile at Row ${row}, Column ${col} from the provided Storyboard Grid reference. Match composition, lighting, and subject exactly. `;
              }
          }

          const prompt = `8K RAW cinematic photograph. ACTION: ${shot.description || "Production shot"}. ${identityInstruction}`;
          const url = await generateStoryboardImage(
            prompt, 
            "nano-banana-pro", 
            input.projectId, 
            ctx.user.id.toString(), 
            "1024x1024",
            visualAnchors
          );
          await saveStoryboardImage(input.projectId, Number(shot.globalShotNumber), url, prompt);
          return { shotNumber: shot.globalShotNumber, success: true };
        } catch (e) {
          console.error(`[BulkMaterialize] Failed shot ${shot.globalShotNumber}:`, e);
          return { shotNumber: shot.globalShotNumber, success: false };
        }
      }));
      
      return { 
        processed: missingShots.length, 
        successCount: results.filter(r => r.status === 'fulfilled').length 
      };
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
      shotNumber: z.number(), // This is the SHOT ID + offset (1,000,000)
      prompt: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { getLockedCharacters } = await import("../db/characters");
        const { getProjectPDSets } = await import("../db/productionDesign");
        const { saveStoryboardImage, getDb } = await import("../db");
        const { scenes, shots } = await import("../../drizzle/schema");
        const { generateStoryboardImage } = await import("../services/aiGeneration");
        const { eq, and } = await import("drizzle-orm");

        // 1. Fetch exact shot metadata for blueprint
        const db = await getDb();
        const shotId = input.shotNumber > 1000000 ? input.shotNumber - 1000000 : null;
        
        const query = db.select({ shots, sceneOrder: scenes.order }).from(shots)
            .innerJoin(scenes, eq(shots.sceneId, scenes.id)) 
            .where(
                and(
                    eq(scenes.projectId, input.projectId),
                    shotId ? eq(shots.id, shotId) : eq(shots.order, input.shotNumber)
                )
            ).limit(1);
            
        const [result] = await query.catch(() => []);
        const shotData = result?.shots;
        
        // NEW: Calculate Global Shot Order (Index in project) for accurate grid mapping
        // Previous logic used scene-local order which caused misalignment after Scene 1.
        const allProjectShots = await db.select({ id: shots.id })
            .from(shots)
            .innerJoin(scenes, eq(shots.sceneId, scenes.id))
            .where(eq(scenes.projectId, input.projectId))
            .orderBy(scenes.order, shots.order);
            
        const globalShotOrder = allProjectShots.findIndex((s: any) => s.id === (shotId || shotData?.id)) + 1;
        const shotOrder = globalShotOrder || 1;
        
        const blueprint = shotData?.aiBlueprint || (typeof shotData?.aiBlueprint === 'string' ? JSON.parse(shotData.aiBlueprint) : {});

        // 2. Fetch Storyboard Grid as visual anchor (IMPORTANT FOR IDENTITY)
        const { storyboardImages: sbTable } = await import("../../drizzle/schema");
        const { gte } = await import("drizzle-orm");
        const grids = await db.select().from(sbTable).where(
          and(
            eq(sbTable.projectId, input.projectId),
            gte(sbTable.shotNumber, 1000)
          )
        ).orderBy(sbTable.shotNumber);

        // Find which page this shot belongs to (12 shots per page in 3x4 layout)
        const pageIdx = Math.floor((shotOrder - 1) / 12);
        const gridForShot = grids[pageIdx];
        
        let visualAnchors: string[] = [];
        let identityInstruction = "";
        
        if (gridForShot) {
            const { cropGridTile } = await import("../services/imageProcessing");
            const localIdx = (shotOrder - 1) % 12;
            const row = Math.floor(localIdx / 3) + 1;
            const col = (row === 2) ? 3 - (localIdx % 3) : (localIdx % 3) + 1;
            try {
                const croppedTileUrl = await cropGridTile(gridForShot.imageUrl, row, col);
                visualAnchors.push(croppedTileUrl);
                identityInstruction = `IDENTITY_LOCK MANDATE: RENDER frame #${shotOrder} from the provided reference. This is a PIXEL-STRICT UPSCALE. Match 100% composition, camera angle, and subject pose. Remove all grid lines and burnins. NO VARIATIONS. `;
            } catch (cropErr) {
                console.warn("[Storyboard Router] Tile crop failed, falling back to full grid:", cropErr);
                visualAnchors.push(gridForShot.imageUrl);
                identityInstruction = `MATCH-IDENTITY MANDATE: Replicate Tile at Row ${row}, Column ${col} from the provided Storyboard Grid reference. Match composition and subject exactly. `;
            }
        }

        // 3. Fetch Locked Assets
        const lockedChars = await getLockedCharacters(input.projectId) || [];
        const projectSets = await getProjectPDSets(input.projectId) || [];
        const approvedSets = projectSets.filter((s: any) => s.status === "approved" || s.referenceImageUrl);

        // 4. Construct Master Prompt
        let cinematicPrompt = `8K RAW cinematic photograph. ACTION: ${input.prompt}. ${identityInstruction} `;
        
        if (blueprint.directorIntent?.emotionalObjective) {
            cinematicPrompt += `EMOTION: ${blueprint.directorIntent.emotionalObjective}. `;
        }
        if (blueprint.cameraSpecs) {
            cinematicPrompt += `CINEMATOGRAPHY: ${blueprint.cameraSpecs.shotType}, ${blueprint.cameraSpecs.movementLogic || "static"} movement. Lens: ${blueprint.cameraSpecs.lensStrategy || "35mm"}. Lighting: ${blueprint.cameraSpecs.lightingSpec || "natural"}. `;
        }

        const searchSpace = `${input.prompt} ${blueprint.directorIntent?.castingRequirements || ""}`.toLowerCase();
        const charsInShot = lockedChars.filter((c: any) => searchSpace.includes(c.name.toLowerCase()));
        
        let imageAnchors: string[] = [...visualAnchors];
        if (charsInShot.length > 0) {
            cinematicPrompt += `CHARACTERS: `;
            charsInShot.forEach((c: any) => {
                cinematicPrompt += `[${c.name}: ${c.description}] `;
                if (c.imageUrl && c.imageUrl !== 'draft' && !imageAnchors.includes(c.imageUrl)) imageAnchors.push(c.imageUrl);
            });
        }

        const setSpace = `${blueprint.productionDesign?.environmentalAtmosphere || ""} ${blueprint.productionDesign?.setDressing || ""}`.toLowerCase();
        const setsInShot = approvedSets.filter((s: any) => setSpace.includes(s.name.toLowerCase()));
        if (setsInShot.length > 0) {
            cinematicPrompt += `SET DESIGN: [${setsInShot[0].name}: ${setsInShot[0].description}]. `;
            if (setsInShot[0].referenceImageUrl && !imageAnchors.includes(setsInShot[0].referenceImageUrl)) imageAnchors.push(setsInShot[0].referenceImageUrl);
        }

        const finalAnchors = imageAnchors.slice(0, 3);
        const targetModel = "nano-banana-pro"; // Strict consistency requires Pro

        // 5. Generate
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
    .mutation(async ({ input }) => {
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
        const { saveStoryboardImage, getDb, getStoryboardImageWithConsistency, updateStoryboardImageStatus } = await import("../db");
        const { shots, scenes } = await import("../../drizzle/schema");
        const { generateStoryboardImage } = await import("../services/aiGeneration");
        const { eq, and } = await import("drizzle-orm");

        // 1. Fetch exact shot metadata for blueprint
        const db = await getDb();
        const shotId = input.shotNumber > 1000000 ? input.shotNumber - 1000000 : null;

        const [result] = await db.select({ shots }).from(shots)
            .innerJoin(scenes, eq(shots.sceneId, scenes.id))
            .where(
                and(
                    eq(scenes.projectId, input.projectId),
                    shotId ? eq(shots.id, shotId) : eq(shots.order, input.shotNumber)
                )
            ).limit(1);

        const shotData = result?.shots;
        const blueprint = shotData?.aiBlueprint || (typeof shotData?.aiBlueprint === 'string' ? JSON.parse(shotData.aiBlueprint) : {});

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
        if (!gridPrompts || gridPrompts.length === 0 || input.visualStyle || input.globalInstructions) {
            console.log("[Storyboard] Building storyboard prompts with visualStyle:", input.visualStyle || "default", "and globalInstructions:", input.globalInstructions || "none");
            gridPrompts = await buildStoryboardPrompts(input.projectId, input.visualStyle, input.globalInstructions);
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
              pageIdx + 1, // Pass pageNumber for visual burnins
              ...visualAnchors
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
              .set({ aiBlueprint: JSON.stringify(blueprintShot) })
              .where(eq(shotsTable.id, dbShot.id));
          }

          // If pipeline produced MORE shots than exist in DB, create new ones
          for (let i = dbShots.length; i < pipelineShots.length; i++) {
            const blueprintShot = pipelineShots[i];
            await db.insert(shotsTable).values({
              sceneId: scene.id,
              order: i + 1,
              visualDescription: String(blueprintShot.directorIntent?.visualDescription || "Generated by Cinema Pipeline"),
              cameraAngle: String(blueprintShot.cameraSpecs?.shotType || "Medium Shot").substring(0, 255),
              movement: String(blueprintShot.cameraSpecs?.movementLogic || "Static"),
              lighting: String(blueprintShot.cameraSpecs?.lightingSpec || "Natural"),
              lens: String(blueprintShot.cameraSpecs?.lensStrategy || "35mm"),
              audioDescription: String(blueprintShot.soundArchitecture?.environmentalSoundscape || "Ambient"),
              aiBlueprint: JSON.stringify(blueprintShot),
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
