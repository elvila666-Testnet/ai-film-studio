/**
 * Shot Designer Router
 * API endpoints for 4K rendering and multi-moment generation
 */

import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

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
    .mutation(async ({ input, ctx }) => {
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

        // Save results to database if needed
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
    .mutation(async ({ input, ctx }) => {
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
