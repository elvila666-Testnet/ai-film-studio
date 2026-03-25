import { getProjectContent, getLockedCharacter } from "../db";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";

export const aiRouter = router({
  generateScript: publicProcedure
    .input(z.object({ brief: z.string(), projectId: z.number().optional(), brandId: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      let globalNotes: string | undefined;
      if (input.projectId) {
        const { getProjectContent } = await import("../db");
        const content = await getProjectContent(input.projectId);
        globalNotes = content?.globalDirectorNotes ?? undefined;
      }

      const { isDevModeEnabled } = await import("../_core/devMode");
      const { getMockScript, mockLLMResponse } = await import("../services/mockData");

      if (isDevModeEnabled()) {
        return mockLLMResponse(getMockScript("default"), 1500);
      }

      // If brandId provided, use brand-compliant generation
      if (input.brandId) {
        const { generateBrandAlignedScript } = await import("../services/brandCompliantGeneration");
        const { getBrand } = await import("../db");
        const brand = await getBrand(input.brandId);
        if (!brand) throw new Error("Brand not found");
        const brandGuidelines = {
          id: brand.id,
          name: brand.name,
          targetCustomer: brand.targetCustomer ?? undefined,
          aesthetic: brand.aesthetic ?? undefined,
          mission: brand.mission ?? undefined,
          coreMessaging: brand.coreMessaging ?? undefined,
        };
        return generateBrandAlignedScript(brandGuidelines, input.brief);
      }

      const { generateScriptFromBrief } = await import("../services/aiGeneration");
      const { analyzeScriptForCharacters } = await import("../services/scriptParser");

      try {
        const script = await generateScriptFromBrief(input.brief, globalNotes);
        console.log("[AI] Script generated successfully");
        const characters = await analyzeScriptForCharacters(script);
        console.log(`[AI] Analyzed characters: ${Object.keys(characters).join(", ")}`);

        return {
          script,
          characters,
          content: script // Maintain compatibility with older frontend code
        };
      } catch (error) {
        console.error("[AI] Script generation failed:", error);
        throw error;
      }
    }),

  refineScript: publicProcedure
    .input(z.object({
      script: z.string(),
      notes: z.string(),
      brandId: z.string().optional(),
      projectId: z.number().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      let globalNotes: string | undefined;
      if (input.projectId) {
        const { getProjectContent } = await import("../db");
        const content = await getProjectContent(input.projectId);
        globalNotes = content?.globalDirectorNotes ?? undefined;
      }

      const { isDevModeEnabled } = await import("../_core/devMode");
      const { mockLLMResponse } = await import("../services/mockData");

      if (isDevModeEnabled()) {
        const refined = `${input.script}\n\n## Refinements Applied\n${input.notes}`;
        return mockLLMResponse(refined, 1000);
      }

      // If brandId provided, use brand-compliant refinement
      if (input.brandId) {
        const { refineBrandAlignedScript } = await import("../services/brandCompliantGeneration");
        const { getBrand } = await import("../db");
        const brand = await getBrand(input.brandId);
        if (!brand) throw new Error("Brand not found");
        const brandGuidelines = {
          id: brand.id,
          name: brand.name,
          targetCustomer: brand.targetCustomer ?? undefined,
          aesthetic: brand.aesthetic ?? undefined,
          mission: brand.mission ?? undefined,
          coreMessaging: brand.coreMessaging ?? undefined,
        };
        return refineBrandAlignedScript(brandGuidelines, input.script, input.notes);
      }

      const { refineScriptWithNotes } = await import("../services/aiGeneration");
      return refineScriptWithNotes(input.script, input.notes, globalNotes);
    }),

  generateVisualStyle: publicProcedure
    .input(z.object({
      script: z.string(),
      brandId: z.string().optional(),
      projectId: z.number().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      let globalNotes: string | undefined;
      if (input.projectId) {
        const { getProjectContent } = await import("../db");
        const content = await getProjectContent(input.projectId);
        globalNotes = content?.globalDirectorNotes ?? undefined;
      }

      const { isDevModeEnabled } = await import("../_core/devMode");
      const { getMockVisualStyle, mockLLMResponse } = await import("../services/mockData");

      if (isDevModeEnabled()) {
        return mockLLMResponse(getMockVisualStyle(), 1500);
      }

      // If brandId provided, use brand-compliant generation
      if (input.brandId) {
        const { generateBrandAlignedVisualStyle } = await import("../services/brandCompliantGeneration");
        const { getBrand } = await import("../db");
        const brand = await getBrand(input.brandId);
        if (!brand) throw new Error("Brand not found");
        const brandGuidelines = {
          id: brand.id,
          name: brand.name,
          targetCustomer: brand.targetCustomer ?? undefined,
          aesthetic: brand.aesthetic ?? undefined,
          mission: brand.mission ?? undefined,
          coreMessaging: brand.coreMessaging ?? undefined,
        };
        return generateBrandAlignedVisualStyle(brandGuidelines, input.script);
      }

      const { generateMasterVisualStyle } = await import("../services/aiGeneration");
      return generateMasterVisualStyle(input.script, globalNotes);
    }),

  generateProductionDesignLook: publicProcedure
    .input(z.object({
      script: z.string(),
      brandId: z.string().optional(),
      projectId: z.number().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      let globalNotes: string | undefined;
      let brandContext: string | undefined;

      if (input.projectId) {
        const { getProjectContent } = await import("../db");
        const content = await getProjectContent(input.projectId);
        globalNotes = content?.globalDirectorNotes ?? undefined;
      }

      if (input.brandId) {
        const { getBrand } = await import("../db");
        const brand = await getBrand(input.brandId);
        if (brand) {
          brandContext = `
BRAND GUIDELINES DOCTRINE:
- Brand Name: ${brand.name}
- Aesthetic/Visual Style: ${brand.aesthetic || "Standard"}
- Target Audience: ${brand.targetCustomer || "General"}
- Mission: ${brand.mission || "N/A"}
- Key Messaging: ${brand.coreMessaging || "N/A"}`;
        }
      }

      const { generateProductionDesignLook } = await import("../services/aiGeneration");
      return generateProductionDesignLook(input.script, brandContext, globalNotes);
    }),

  generateHighFidelityArtDepartmentLook: publicProcedure
    .input(z.object({
      projectId: z.number(),
      script: z.string(),
      brandId: z.string().optional(),
      cineRefinementNotes: z.string().optional(),
      pdRefinementNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const { getProjectContent, getBrand } = await import("../db");
      const content = await getProjectContent(input.projectId);
      let globalNotes = content?.globalDirectorNotes ?? "";

      if (input.brandId) {
        const brand = await getBrand(input.brandId);
        if (brand) {
          globalNotes += `\n\nBRAND CONTEXT:\n- Name: ${brand.name}\n- Aesthetic: ${brand.aesthetic}\n- Mission: ${brand.mission}`;
        }
      }

      const { runCinemaExecutionPipeline } = await import("../services/cinemaOrchestrator");
      return runCinemaExecutionPipeline({
        projectId: input.projectId,
        sceneScript: input.script,
        globalNotes: globalNotes,
        scaleMode: "High Fidelity",
        cineRefinementNotes: input.cineRefinementNotes,
        pdRefinementNotes: input.pdRefinementNotes
      });
    }),


  refineVisualStyle: publicProcedure
    .input(z.object({
      visualStyle: z.string(),
      notes: z.string(),
      brandId: z.string().optional(),
      projectId: z.number().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      let globalNotes: string | undefined;
      if (input.projectId) {
        const { getProjectContent } = await import("../db");
        const content = await getProjectContent(input.projectId);
        globalNotes = content?.globalDirectorNotes ?? undefined;
      }

      const { isDevModeEnabled } = await import("../_core/devMode");
      const { mockLLMResponse } = await import("../services/mockData");

      if (isDevModeEnabled()) {
        const refined = `${input.visualStyle}\n\n## Refinements Applied\n${input.notes}`;
        return mockLLMResponse(refined, 1500);
      }

      // If brandId provided, use brand-compliant refinement
      if (input.brandId) {
        const { refineBrandAlignedVisualStyle } = await import("../services/brandCompliantGeneration");
        const { getBrand } = await import("../db");
        const brand = await getBrand(input.brandId);
        if (!brand) throw new Error("Brand not found");
        const brandGuidelines = {
          id: brand.id,
          name: brand.name,
          targetCustomer: brand.targetCustomer ?? undefined,
          aesthetic: brand.aesthetic ?? undefined,
          mission: brand.mission ?? undefined,
          coreMessaging: brand.coreMessaging ?? undefined,
        };
        return refineBrandAlignedVisualStyle(brandGuidelines, input.visualStyle, input.notes);
      }

      const { refineMasterVisualStyle } = await import("../services/aiGeneration");
      return refineMasterVisualStyle(input.visualStyle, input.notes, globalNotes);
    }),

  generateTechnicalShots: publicProcedure
    .input(z.object({
      script: z.string(),
      visualStyle: z.string(),
      brandId: z.string().optional(),
      projectId: z.number().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      let globalNotes: string | undefined;
      if (input.projectId) {
        const { getProjectContent } = await import("../db");
        const content = await getProjectContent(input.projectId);
        globalNotes = content?.globalDirectorNotes ?? undefined;
      }

      const { isDevModeEnabled } = await import("../_core/devMode");
      const { getMockTechnicalShots, mockLLMResponse } = await import("../services/mockData");

      if (isDevModeEnabled()) {
        return mockLLMResponse(JSON.stringify(getMockTechnicalShots(), null, 2), 1500);
      }

      // If brandId provided, use brand-compliant storyboard generation
      if (input.brandId) {
        const { getBrand } = await import("../db");
        const brand = await getBrand(input.brandId);
        if (brand) {
          const brandContext = `
BRAND GUIDELINES DOCTRINE:
- Brand Name: ${brand.name}
- Aesthetic/Visual Style: ${brand.aesthetic || "Standard"}
- Target Audience: ${brand.targetCustomer || "General"}
- Mission: ${brand.mission || "N/A"}
- Key Messaging: ${brand.coreMessaging || "N/A"}

Ensure all technical shots align with these brand pillars.`;

          globalNotes = (globalNotes ? globalNotes + "\n\n" : "") + brandContext;
        }
      }

      const { runCinemaExecutionPipeline } = await import("../services/cinemaOrchestrator");
      const pipelineInput = {
        sceneScript: input.script,
        globalNotes: globalNotes,
        scaleMode: "Standard Cinematic"
      };
      const finalBlueprint = await runCinemaExecutionPipeline(pipelineInput);

      return finalBlueprint.finalHarmonizedDocument.shots.map(shot => ({
        shot: shot.shotNumber,
        tipo_plano: shot.cameraSpecs.shotType || "Medium Shot",
        accion: shot.directorIntent.visualDescription || "Action",
        intencion: shot.directorIntent.emotionalObjective || "Narrative",
        movimiento: shot.cameraSpecs.movementLogic || "Static",
        tecnica: (shot.cameraSpecs.lensStrategy || "") + " | " + (shot.cameraSpecs.tStop || ""),
        iluminacion: (shot.productionDesign.environmentalAtmosphere || "") + " | " + (shot.cameraSpecs.lightingSpec || ""),
        audio: shot.soundArchitecture.environmentalSoundscape || "",

        description: shot.directorIntent.visualDescription || "Action",
        camera_angle: shot.cameraSpecs.shotType || "Medium Shot"
      }));
    }),

  generateImagePrompt: publicProcedure
    .input(z.object({
      projectId: z.number().optional(),
      shot: z.object({
        shot: z.number(),
        tipo_plano: z.string(),
        accion: z.string(),
        intencion: z.string(),
      }),
      visualStyle: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      let globalNotes: string | undefined;
      let characterPersona: string | undefined;

      if (input.projectId) {
        const content = await getProjectContent(input.projectId);
        globalNotes = content?.globalDirectorNotes ?? undefined;

        const lockedChar = await getLockedCharacter(input.projectId);
        if (lockedChar) {
          characterPersona = `${lockedChar.name}: ${lockedChar.description}`;
        }
      }

      const { generateImagePromptForShot } = await import("../services/aiGeneration");
      return generateImagePromptForShot(input.shot, input.visualStyle, globalNotes, characterPersona);
    }),

  refineImagePrompt: publicProcedure
    .input(z.object({ prompt: z.string(), notes: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const { refineImagePrompt } = await import("../services/aiGeneration");
      return refineImagePrompt(input.prompt, input.notes);
    }),

  generateStyleGuide: publicProcedure
    .input(z.object({
      script: z.string(),
      visualStyle: z.string(),
      projectId: z.number().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      let globalNotes: string | undefined;
      let brandDNA: string | undefined;
      if (input.projectId) {
        const content = await getProjectContent(input.projectId);
        globalNotes = content?.globalDirectorNotes ?? undefined;
        // Fetch brand DNA if brandId is present
        if (content?.brandId) {
          const { getBrandDNA } = await import("../services/brandService");
          brandDNA = await getBrandDNA(content.brandId);
        }
      }
      const { generateStyleGuideJSON } = await import("../services/aiGeneration");
      return generateStyleGuideJSON(input.script, input.visualStyle, globalNotes, brandDNA);
    }),

  generateStoryboardImage: publicProcedure
    .input(z.object({
      prompt: z.string(),
      characterReference: z.record(z.string(), z.string()).optional(),
      variationIndex: z.number().optional(),
      modelId: z.string().optional(),
      qualityTier: z.enum(["fast", "quality"]).default("fast").optional(),
      projectId: z.number().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const { generateStoryboardImageVariation, generateStoryboardImageWithConsistency } = await import("../services/aiGeneration");
      const charRef = input.characterReference as Record<string, string> | undefined;

      // Pass modelId if provided
      if (input.variationIndex !== undefined && charRef) {
        return generateStoryboardImageVariation(
          input.prompt,
          charRef,
          input.variationIndex,
          input.modelId,
          input.projectId,
          ctx.user.id.toString()
        );
      }
      return generateStoryboardImageWithConsistency(
        input.prompt,
        charRef,
        undefined,
        input.modelId,
        input.qualityTier,
        input.projectId,
        ctx.user.id.toString()
      );
    }),

  generateCharacterImage: publicProcedure
    .input(z.object({ name: z.string(), description: z.string(), modelId: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const { generateStoryboardImage } = await import("../services/aiGeneration");
      const prompt = `8K RAW cinematic photograph of a real person, ${input.name}, ${input.description}. This is a professional studio character portrait, not a drawing or illustration. 
      Focus: Hyper-realistic skin textures, natural hair, depth in eyes. 
      Optics: Arri Alexa 35, Anamorphic lenses, f/2.8.
      Lighting: Soft studio rim light.
      Style: Professional character reference sheet. Top: Full-body turnaround (front, profiles, back). Bottom: Detailed portraits.
      Negative Prompts: drawing, 3D render, cartoon, digital art, sketch, text.`;

      const result = await generateStoryboardImage(
        prompt,
        input.modelId || "Nano Banana 2",
        undefined, // No projectId for generic character gen? Or optional
        ctx.user.id.toString()
      );
      return { imageUrl: result };
    }),

  generateCharacterNano: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string(),
      referenceImages: z.array(z.string()),
      modelId: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { generateCharacterNano } = await import("../services/aiGeneration");
      const promptParams = `Character Name: ${input.name}. Description: ${input.description}`;
      const result = await generateCharacterNano(
        promptParams,
        input.referenceImages,
        undefined, // No projectId for generic character gen
        ctx.user.id.toString(),
        false // Not a wardrobe change
      );
      return { imageUrl: result };
    }),

  generateBatchStoryboard: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("Database unreachable");

      const { shots, generations, scenes } = await import("../../drizzle/schema");
      const { eq, inArray } = await import("drizzle-orm");
      const { generateStoryboardImage } = await import("../services/aiGeneration");

      // 1. Fetch relational shots
      const sceneList = await db.select().from(scenes).where(eq(scenes.projectId, input.projectId));
      if (sceneList.length === 0) throw new Error("No scenes found for this project");

      const sceneIds = sceneList.map((s: { id: number }) => s.id);
      const shotList = await db.select().from(shots).where(inArray(shots.sceneId, sceneIds)).orderBy(shots.order);
      if (shotList.length === 0) throw new Error("No shots found for this project. Breakdown the script first.");

      // Fetch Locked Characters and Sets to anchor the visual generation
      const { getLockedCharacters } = await import("../db/characters");
      const { getProjectPDSets } = await import("../db/productionDesign");
      
      const lockedChars = await getLockedCharacters(input.projectId) || [];
      const projectSets = await getProjectPDSets(input.projectId) || [];
      const approvedSets = projectSets.filter((s: any) => s.status === "approved" || s.referenceImageUrl);

      const userId = ctx.user.id.toString();

      // 2. Generate Images in Batch
      const generateShotAsset = async (shot: { id: number; visualDescription: string; aiBlueprint: any }) => {
        try {
          const blueprint = shot.aiBlueprint || {};
          let cinematicPrompt = `8K RAW cinematic photograph. ACTION: ${shot.visualDescription}. `;
          
          if (blueprint.directorIntent?.emotionalObjective) {
              cinematicPrompt += `EMOTION: ${blueprint.directorIntent.emotionalObjective}. `;
          }

          if (blueprint.cameraSpecs) {
              cinematicPrompt += `CINEMATOGRAPHY: ${blueprint.cameraSpecs.shotType}, ${blueprint.cameraSpecs.movementLogic || "static"} movement. Lens: ${blueprint.cameraSpecs.lensStrategy || "35mm"}. Lighting: ${blueprint.cameraSpecs.lightingSpec || "natural"}. `;
          }

          // Search characters
          const searchSpace = `${shot.visualDescription} ${blueprint.directorIntent?.castingRequirements || ""}`.toLowerCase();
          const charsInShot = lockedChars.filter((c: any) => searchSpace.includes(c.name.toLowerCase()));
          
          let imageAnchors: string[] = [];
          if (charsInShot.length > 0) {
              cinematicPrompt += `CHARACTERS: `;
              charsInShot.forEach((c: any) => {
                  cinematicPrompt += `[${c.name}: ${c.description}] `;
                  if (c.imageUrl && c.imageUrl !== 'draft') imageAnchors.push(c.imageUrl);
              });
          }

          // Search Sets
          const setSpace = `${blueprint.productionDesign?.environmentalAtmosphere || ""} ${blueprint.productionDesign?.setDressing || ""}`.toLowerCase();
          const setsInShot = approvedSets.filter((s: any) => setSpace.includes(s.name.toLowerCase()));
          
          if (setsInShot.length > 0) {
              cinematicPrompt += `SET DESIGN: [${setsInShot[0].name}: ${setsInShot[0].description}]. `;
              if (setsInShot[0].referenceImageUrl) imageAnchors.push(setsInShot[0].referenceImageUrl);
          }

          // Cap anchors to 3 to prevent Replicate overload
          const finalAnchors = imageAnchors.slice(0, 3);
          const targetModel = finalAnchors.length > 0 ? "nano-banana-pro" : "flux-fast";

          const imageUrl = await generateStoryboardImage(
            cinematicPrompt,
            targetModel,
            input.projectId,
            userId,
            "1024x1024",
            finalAnchors
          );

          await db.insert(generations).values({
            shotId: shot.id,
            projectId: input.projectId,
            imageUrl,
            prompt: cinematicPrompt,
            model: targetModel,
            qualityTier: targetModel === "nano-banana-pro" ? "quality" : "fast",
            cost: targetModel === "nano-banana-pro" ? "0.05" : "0.005",
          });

          return { shotId: shot.id, success: true, imageUrl };
        } catch (error) {
          console.error(`Failed to generate shot ${shot.id}:`, error);
          return { shotId: shot.id, success: false, error };
        }
      };

      // Run with concurrency limit of 3
      const results = [];
      const concurrency = 3;
      for (let i = 0; i < shotList.length; i += concurrency) {
        const chunk = shotList.slice(i, i + concurrency);
        const chunkResults = await Promise.all(chunk.map(generateShotAsset));
        results.push(...chunkResults);
      }

      return { success: true, results };
    }),
});
