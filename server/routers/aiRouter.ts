import {
  getReferenceImages, saveReferenceImage, deleteReferenceImage,
  createEditorProject, getEditorProjectsByProjectId, getEditorClips, createEditorClip, updateEditorClip, deleteEditorClip, createEditorTrack, getEditorTracks, createEditorExport, getEditorExports, updateEditorExport, createComment, getClipComments, updateComment, deleteComment, getAnimaticConfig, updateFrameDurations, updateAnimaticAudio, getStoryboardFrameOrder, updateFrameOrder, getFrameHistory, createFrameHistoryVersion, getFrameNotes, saveFrameNotes, deleteFrameNotes,
  createCharacter, getCharacter, getProjectCharacters, getLockedCharacter, lockCharacter, unlockAllCharacters, updateCharacter, deleteCharacter,
  getProjectContent
} from "../db";
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

      const { generateTechnicalShots } = await import("../services/aiGeneration");
      return generateTechnicalShots(input.script, input.visualStyle, globalNotes);
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
      if (input.projectId) {
        const content = await getProjectContent(input.projectId);
        globalNotes = content?.globalDirectorNotes ?? undefined;
      }
      const { generateStyleGuideJSON } = await import("../services/aiGeneration");
      return generateStyleGuideJSON(input.script, input.visualStyle, globalNotes);
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
      const prompt = `Ultra realistic 8k movie still of ${input.name}, shot on Arri Alexa 35, 25mm lens, cinematic lighting, hyper-realistic, highly detailed skin texture, dramatic atmosphere, film grain, color graded. Description: ${input.description}.`;
      // Use Apiyi for characters explicitly to avoid Replicate credit issues
      const result = await generateStoryboardImage(
        prompt,
        "apiyi-default",
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
      const promptParams = `Ultra-detailed Character Name: ${input.name}. Baseline: ${input.description}`;
      const result = await generateCharacterNano(
        promptParams,
        input.referenceImages,
        "apiyi-default",
        undefined, // No projectId for generic character gen? Or optional
        ctx.user.id.toString()
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

      const userId = ctx.user.id.toString();

      // 2. Generate Images in Batch (Concurrency Limited)
      const generateShotAsset = async (shot: { id: number; visualDescription: string }) => {
        try {
          // Use Flux Schnell for batch speed
          const imageUrl = await generateStoryboardImage(
            shot.visualDescription,
            "flux-fast",
            input.projectId,
            userId
          );

          // Save to generations table
          await db.insert(generations).values({
            shotId: shot.id,
            projectId: input.projectId,
            imageUrl,
            prompt: shot.visualDescription,
            model: "flux-fast",
            qualityTier: "fast",
            cost: "0.005", // Schnell estimate
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
