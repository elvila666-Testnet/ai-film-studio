/**
 * Shot Designer Router
 * API endpoints for 4K rendering and multi-moment generation
 */

import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { storyboardImages, projectContent } from "../../drizzle/schema";
import { getDb } from "../_core/db";
import { GeminiProvider } from "../services/providers/geminiProvider";
import { ensurePermanentUrl } from "../services/aiGeneration";

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
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { generateShotDesign, validateShotDesignRequest } = await import(
          "../services/shotDesigner"
        );

        // Validate request
        const validation = validateShotDesignRequest(input);
        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validation.errors.join("; "),
          });
        }

        // Generate shot design
        const result = await generateShotDesign(input);

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

        // Build 4K upscaling prompt
        const upscalePrompt = `
You are a professional cinematographer upscaling a storyboard frame to 4K UHD resolution.

Original Frame Description:
${storyboardFrame.prompt}

Task:
1. Upscale the reference image to 4K (3840×2160) resolution
2. Enhance details, textures, and clarity
3. Maintain the exact composition and framing
4. Improve color grading and cinematic quality
5. Preserve character consistency and environment details

Output:
- Single 4K UHD image (16:9 aspect ratio)
- Professional cinematographic quality
- Enhanced detail and clarity
- Hyper-realistic photographic style
`;

        // Use Gemini Provider to render 4K
        const geminiProvider = new GeminiProvider();
        const result = await geminiProvider.generateImage(
          {
            prompt: upscalePrompt,
            style: "Cinematic 4K",
            resolution: "3840x2160",
            count: 1,
            imageInputs: storyboardFrame.imageUrl ? [storyboardFrame.imageUrl] : undefined,
          },
          "imagen-3.0-generate-001"
        );

        // Ensure permanent URL
        const permanentUrl = await ensurePermanentUrl(result.url);

        console.log(`[ShotDesigner] 4K frame rendered successfully: ${permanentUrl}`);

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
         // search for shots in range [shotNumber * 100, (shotNumber + 1) * 100)
         const start = input.shotNumber * 100;
         const end = (input.shotNumber + 1) * 100;
         // Note: Using a simplified filter for now
         const moments = await query;
         return moments.filter(m => m.shotNumber >= start && m.shotNumber < end) || [];
      }

      const moments = await query;
      return moments || [];
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
