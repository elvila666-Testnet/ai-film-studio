import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { logUsage } from "../services/ledgerService";
import { estimateCost } from "../services/pricingService";
import { getShootingIngredients, buildVideoPrompt } from "../services/agents/production/shootingAgent";
import { ProviderFactory } from "../services/providers/providerFactory";
import { getDb, getStoryboardImages } from "../db";
import { storyboardImages } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const shootingRouter = router({

    // Render a single approved 4K frame to video
    renderShot: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            storyboardImageId: z.number(),
            provider: z.enum(["sora", "flow", "kling", "whan", "veo3", "replicate"]).default("flow"),
            durationSeconds: z.number().default(5),
            isApproved: z.boolean().default(false),
        }))
        .mutation(async ({ input, ctx }) => {
            // FinOps Guard
            if (!input.isApproved) {
                const estimatedCost = estimateCost(input.provider === "veo3" ? "veo3" : "sora", input.durationSeconds);
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: `Financial Guardrail: Estimated $${estimatedCost.toFixed(3)} to render this shot with ${input.provider}. Confirm to proceed.`,
                    cause: { requiresApproval: true, estimatedCost, provider: input.provider }
                });
            }

            // Gather ingredients
            const ingredients = await getShootingIngredients(input.storyboardImageId, input.projectId);

            // Build optimized video prompt
            const videoPrompt = await buildVideoPrompt(ingredients);

            // Spin up the video provider
            const apiKey = process.env.REPLICATE_API_KEY ?? process.env.FAL_API_KEY ?? "";
            const provider = ProviderFactory.createVideoProvider(input.provider as Parameters<typeof ProviderFactory.createVideoProvider>[0], apiKey);
            if (!provider) {
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Provider ${input.provider} not available.` });
            }

            const result = await provider.generateVideo({
                prompt: videoPrompt,
                imageUrl: ingredients.keyframeUrl,
                duration: input.durationSeconds,
                resolution: "1920x1080",
                projectId: input.projectId,
                userId: ctx.user.id.toString(),
            });

            // Save video URL back to storyboard frame
            const db = await getDb();
            if (db && result.url) {
                await db.update(storyboardImages)
                    .set({ videoUrl: result.url })
                    .where(and(
                        eq(storyboardImages.id, input.storyboardImageId),
                        eq(storyboardImages.projectId, input.projectId)
                    ));
            }

            const cost = estimateCost(input.provider === "veo3" ? "veo3" : "sora", input.durationSeconds);
            await logUsage(input.projectId, ctx.user.id.toString(), input.provider, cost, "SHOOTING_RENDER");

            return { success: true, videoUrl: result.url };
        }),

    // Render all approved frames for a project
    renderAll: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            provider: z.enum(["sora", "flow", "kling", "whan", "veo3", "replicate"]).default("flow"),
            isApproved: z.boolean().default(false),
        }))
        .mutation(async ({ input }) => {
            if (!input.isApproved) {
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: "Rendering all shots requires explicit approval due to cost. Set isApproved: true to proceed.",
                    cause: { requiresApproval: true }
                });
            }

            const frames = await getStoryboardImages(input.projectId);
            type SBImage = Awaited<ReturnType<typeof getStoryboardImages>>[number];
            const approvedFrames = frames.filter((f: SBImage) => f.status === "approved" && f.masterImageUrl);

            if (approvedFrames.length === 0) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "No approved 4K keyframes found. Approve and upscale frames from the storyboard first."
                });
            }

            return {
                success: true,
                message: `🎬 Queued ${approvedFrames.length} shots for rendering. Use renderShot for each frame individually.`,
                approvedFrameIds: approvedFrames.map((f: SBImage) => f.id),
            };
        }),
});
