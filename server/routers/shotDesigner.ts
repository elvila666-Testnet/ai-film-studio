/**
 * Shot Designer Router
 * API endpoints for 4K rendering and multi-moment generation
 */

import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { storyboardImages } from "../../drizzle/schema";
import { getDb } from "../db";
import { saveNewShotVariant, getShotVariants } from "../db/storyboard";
import { GeminiProvider } from "../services/providers/geminiProvider";
import { ensurePermanentUrl, generateStoryboardImage } from "../services/aiGeneration";
import { getLockedCharacters } from "../db/characters";
import { getProjectPDSets } from "../db/productionDesign";

export const shotDesignerRouter = router({
  /**
   * Generate a single 4K shot with multiple moments
   */
  generateShot: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        shotNumber: z.number(),
        basePrompt: z.string(),
        characterReferences: z.record(z.string()),
        setReferences: z.record(z.string()),
        resolution: z.enum(["1080p", "2k", "4k"]),
        moments: z.array(
          z.object({
            momentNumber: z.number(),
            description: z.string(),
            duration: z.number(),
            emotionalBeat: z.string().optional(),
            cameraMovement: z.string().optional(),
          })
        ),
        cinematographyStyle: z.string().optional(),
        visualStyle: z.string().optional(),
        storyboardImageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { generateShotDesign, validateShotDesignRequest } = await import(
          "../services/shotDesigner"
        );

        // Fetch storyboard frame if not provided but exists in DB
        let currentStoryboardUrl = input.storyboardImageUrl;
        if (!currentStoryboardUrl) {
          const db = await getDb();
          if (db) {
            const frame = await db.select().from(storyboardImages).where(and(eq(storyboardImages.projectId, input.projectId), eq(storyboardImages.shotNumber, input.shotNumber))).limit(1);
            if (frame[0]) currentStoryboardUrl = frame[0].imageUrl || undefined;
          }
        }

        // Validate request
        const validation = validateShotDesignRequest(input);
        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validation.errors.join("; "),
          });
        }

        // Generate shot design
        const result = await generateShotDesign({
            ...input,
            storyboardImageUrl: currentStoryboardUrl
        });

        if (result.status === "failed") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error || "Failed to generate shot design",
          });
        }

        // Save results to database
        if (result.moments.length > 0) {
          const { saveStoryboardImage } = await import("../db");
          for (const moment of result.moments) {
            await saveStoryboardImage(
              input.projectId,
              input.shotNumber * 100 + moment.momentNumber,
              moment.imageUrl,
              moment.prompt
            );
          }
        }

        return result;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to generate shot design";
        console.error("[shotDesignerRouter] generateShot failed:", message);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
        });
      }
    }),

  /**
   * Render a storyboard frame in 4K resolution
   */
  render4kFrame: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        frameId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

      // Get the frame
      const frameList = await db
        .select()
        .from(storyboardImages)
        .where(eq(storyboardImages.id, input.frameId))
        .limit(1);

      if (!frameList || frameList.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Frame not found" });
      }

      const storyboardFrame = frameList[0];

      try {
        console.log(`[ShotDesigner] Rendering 4K frame ${input.frameId} for shot ${storyboardFrame.shotNumber}`);

        // Build 4K upscaling prompt - STRICT IDENTITY REINFORCEMENT
        const upscalePrompt = `
PIXEL-PERFECT CINEMATIC UPSCALE MANDATE.
You are a high-end Digital Intermediate (DI) colorist and upscaler.

Reference Image Description:
${storyboardFrame.prompt}

STRICT CONSTRAINTS:
1. IDENTITY: The output MUST be a pixel-perfect higher resolution version of the input.
2. COMPOSITION: Do NOT change the position of any elements. Do NOT change camera angle.
3. CONTENT: Do NOT add new objects, characters, or background elements. 
4. ENHANCEMENT: Focus EXCLUSIVELY on:
   - Increasing effective resolution to 4K UHD.
   - Enhancing textures (skin, fabric, metal, water).
   - Fine-tuning light rays and global illumination.
   - Professional cinematic color grading (HDR look).
   - Removing compression artifacts while preserving film grain.

Output: One ultra-sharp 4K UHD frame (16:9).
`;

        // Use Gemini Provider to render 4K
        const geminiProvider = new GeminiProvider();
        const result = await geminiProvider.generateImage(
          {
            prompt: upscalePrompt,
            style: "Cinematic 4K",
            resolution: "3840x2160",
            count: 1,
            quality: "hd",
            imageInputs: storyboardFrame.imageUrl ? [storyboardFrame.imageUrl] : undefined,
          },
          "imagen-3.0-generate-001"
        );

        // Ensure permanent URL
        const permanentUrl = await ensurePermanentUrl(result.url);

        // Update DB with masterImageUrl
        await db.update(storyboardImages)
          .set({ masterImageUrl: permanentUrl })
          .where(eq(storyboardImages.id, input.frameId));

        console.log(`[ShotDesigner] 4K frame rendered and saved: ${permanentUrl}`);

        return {
          id: storyboardFrame.id,
          shotNumber: storyboardFrame.shotNumber,
          imageUrl: permanentUrl,
          prompt: storyboardFrame.prompt,
          status: "4k_rendered",
          resolution: "4K UHD",
          processingTime: result.processingTime,
        };
      } catch (error: any) {
        console.error("[ShotDesigner] 4K rendering failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `4K rendering failed: ${error.message}`,
        });
      }
    }),

  /**
   * Generate multiple shots in sequence
   */
  generateSequence: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        shots: z.array(
          z.object({
            shotNumber: z.number(),
            basePrompt: z.string(),
            characterReferences: z.record(z.string()),
            setReferences: z.record(z.string()),
            resolution: z.enum(["1080p", "2k", "4k"]),
            moments: z.array(
              z.object({
                momentNumber: z.number(),
                description: z.string(),
                duration: z.number(),
                emotionalBeat: z.string().optional(),
                cameraMovement: z.string().optional(),
              })
            ),
            cinematographyStyle: z.string().optional(),
            visualStyle: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { generateSequenceDesign } = await import(
          "../services/shotDesigner"
        );

        // Generate all shots
        const results = await generateSequenceDesign(
          input.shots.map((shot) => ({
            projectId: input.projectId,
            ...shot,
          }))
        );

        // Save all results
        if (results.some((r) => r.status !== "failed")) {
          const { saveStoryboardImage } = await import("../db");
          for (const result of results) {
            for (const moment of result.moments) {
              await saveStoryboardImage(
                input.projectId,
                result.shotNumber * 100 + moment.momentNumber,
                moment.imageUrl,
                moment.prompt
              );
            }
          }
        }

        return {
          shots: results,
          successCount: results.filter((r) => r.status !== "failed").length,
          failureCount: results.filter((r) => r.status === "failed").length,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to generate sequence";
        console.error("[shotDesignerRouter] generateSequence failed:", message);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
        });
      }
    }),

  /**
   * Estimate processing time for a shot design
   */
  estimateTime: protectedProcedure
    .input(
      z.object({
        momentCount: z.number(),
        resolution: z.enum(["1080p", "2k", "4k"]),
      })
    )
    .query(async ({ input }) => {
      try {
        const { estimateProcessingTime } = await import(
          "../services/shotDesigner"
        );

        const estimatedSeconds = estimateProcessingTime(
          input.momentCount,
          input.resolution
        );

        return {
          estimatedSeconds,
          estimatedMinutes: Math.ceil(estimatedSeconds / 60),
          formattedTime: formatEstimatedTime(estimatedSeconds),
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to estimate time";
        console.error("[shotDesignerRouter] estimateTime failed:", message);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
        });
      }
    }),

  /**
   * Validate a shot design request
   */
  validate: protectedProcedure
    .input(
      z.object({
        basePrompt: z.string(),
        momentCount: z.number(),
        resolution: z.enum(["1080p", "2k", "4k"]),
      })
    )
    .query(async ({ input }) => {
      try {
        const { validateShotDesignRequest } = await import(
          "../services/shotDesigner"
        );

        const validation = validateShotDesignRequest({
          projectId: 0,
          shotNumber: 0,
          basePrompt: input.basePrompt,
          characterReferences: {},
          setReferences: {},
          resolution: input.resolution,
          moments: Array.from({ length: input.momentCount }, (_, i) => ({
            momentNumber: i + 1,
            description: "Moment description",
            duration: 1,
          })),
        });

        return {
          valid: validation.valid,
          errors: validation.errors,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Validation failed";
        console.error("[shotDesignerRouter] validate failed:", message);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
        });
      }
    }),

  /**
   * Generate multiple moments for a specific shot
   */
  generateMoments: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        frameId: z.number(),
        momentCount: z.number().default(4),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

      // 1. Get the original frame
      const frameList = await db
        .select()
        .from(storyboardImages)
        .where(eq(storyboardImages.id, input.frameId))
        .limit(1);

      if (!frameList || frameList.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Frame not found" });
      }

      const frame = frameList[0];

      // 2. Get project-wide references for consistency
      const { getLockedCharacters } = await import("../db/characters");
      const { productionDesignSets } = await import("../../drizzle/schema");
      
      const lockedChars = await getLockedCharacters(input.projectId);
      const lockedSets = await db.select().from(productionDesignSets).where(eq(productionDesignSets.projectId, input.projectId));

      const characterReferences: Record<string, string> = {};
      lockedChars.forEach((c: any) => { characterReferences[c.name] = c.imageUrl; });

      const setReferences: Record<string, string> = {};
      lockedSets.forEach((s: any) => { if (s.imageUrl) setReferences[s.name] = s.imageUrl; });

      // 3. Prepare moment requests
      const momentsList = Array.from({ length: input.momentCount }, (_, i) => ({
        momentNumber: i + 1,
        description: `Natural continuation of the shot: ${frame.prompt}. Variation ${i + 1}.`,
        duration: 2,
        emotionalBeat: "Consistent with scene",
        cameraMovement: "Subtle cinematic movement",
      }));

      // 4. Call service
      const { generateShotDesign } = await import("../services/shotDesigner");
      const result = await generateShotDesign({
        projectId: input.projectId,
        shotNumber: frame.shotNumber,
        basePrompt: frame.prompt || "Cinematic shot",
        characterReferences,
        setReferences,
        resolution: "4k",
        moments: momentsList,
        storyboardImageUrl: frame.imageUrl || undefined,
      });

      // 5. Save results
      if (result.moments.length > 0) {
        const { saveStoryboardImage } = await import("../db");
        for (const moment of result.moments) {
          await saveStoryboardImage(
            input.projectId,
            frame.shotNumber * 100 + moment.momentNumber,
            moment.imageUrl,
            moment.prompt
          );
        }
      }

      return result;
    }),

  /**
   * Get all moments for a shot
   */
  getMoments: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        shotNumber: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

      // Get all storyboard images for this shot
      let query = db
        .select()
        .from(storyboardImages)
        .where(eq(storyboardImages.projectId, input.projectId));

      if (input.shotNumber !== undefined) {
         // Using shot numbering logic (shotNumber * 100 + momentNumber)
         const start = input.shotNumber * 100;
         const end = (input.shotNumber + 1) * 100;
         const moments = await query;
         return moments.filter((m: any) => m.shotNumber >= start && m.shotNumber < end) || [];
      }

      const moments = await query;
      return moments || [];
    }),

  /**
   * Get all versions for a specific shot
   */
  getShotVersions: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      shotNumber: z.number(),
    }))
    .query(async ({ input }) => {
      return await getShotVariants(input.projectId, input.shotNumber);
    }),

  /**
   * Refine a shot with feedback and visual anchors
   */
  refineShot: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      shotNumber: z.number(),
      feedback: z.string(),
      parentImageUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

        // 1. Fetch character/set anchors for high-fidelity continuity
        const lockedChars = await getLockedCharacters(input.projectId) || [];
        const projectSets = await getProjectPDSets(input.projectId) || [];
        const approvedSets = projectSets.filter((s: any) => s.status === "approved" || s.referenceImageUrl);

        // 2. Build Anchors
        const imageAnchors = [];
        if (input.parentImageUrl) imageAnchors.push(input.parentImageUrl);
        
        // Add one main character if detected in feedback or description? 
        // For now, take first locked character as a secondary anchor
        if (lockedChars.length > 0 && lockedChars[0].imageUrl && lockedChars[0].imageUrl !== 'draft') {
            imageAnchors.push(lockedChars[0].imageUrl);
        }
        if (approvedSets.length > 0 && approvedSets[0].referenceImageUrl) {
            imageAnchors.push(approvedSets[0].referenceImageUrl);
        }

        // 3. Construct Refinement Prompt
        const finalPrompt = `PIXEL-PERFECT REFINEMENT: ${input.feedback}. 
        MAINTAIN VISUAL CONTINUITY with the provided reference frame. 
        Only change what is requested in the feedback.
        Technical Style: 8K RAW cinematic photograph.`;

        // 4. Generate
        const imageUrl = await generateStoryboardImage(
          finalPrompt,
          "nano-banana-pro",
          input.projectId,
          ctx.user.id.toString(),
          "1024x1024",
          imageAnchors.slice(0, 3)
        );

        // 5. Save as NEW variant
        await saveNewShotVariant(input.projectId, input.shotNumber, imageUrl, finalPrompt);

        return { imageUrl };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to refine shot";
        console.error("[shotDesignerRouter] refineShot failed:", message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
        });
      }
    }),
});

/**
 * Format estimated time for display
 */
function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}
