import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { logUsage } from "../services/ledgerService";
import { estimateCost } from "../services/pricingService";
import { buildStoryboardPrompts } from "../services/agents/production/promptEngineerAgent";
import { generateGridImage } from "../services/aiGeneration";
import { saveStoryboardImage } from "../db";

export const promptEngineerRouter = router({

    buildPrompts: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const gridPrompts = await buildStoryboardPrompts(input.projectId);

            const cost = estimateCost("gemini-1.5-flash", 1);
            await logUsage(input.projectId, ctx.user.id.toString(), "gemini-1.5-flash", cost, "PROMPT_ENGINEER_BUILD");

            return {
                success: true,
                promptsBuilt: gridPrompts.length,
                message: `✅ ${gridPrompts.length} storyboard grid prompt(s) ready. Use storyboardAgent.generateFromPrompts to render.`
            };
        }),

    getPrompts: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            const prompts = await getBuiltPrompts(input.projectId);
            return { prompts, hasPrompts: !!prompts };
        }),

    // Render all built prompts into storyboard grids
    renderAllGrids: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const gridPrompts = await getBuiltPrompts(input.projectId);
            if (!gridPrompts || gridPrompts.length === 0) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No prompts built yet. Run buildPrompts first." });
            }

            const results: Array<{ pageNumber: number; gridImageUrl: string }> = [];

            // Offload to background
            (async () => {
                for (const gp of gridPrompts) {
                    try {
                        const imageUrl = await generateGridImage(
                            gp.masterPrompt,
                            input.projectId,
                            ctx.user.id.toString(),
                            gp.characterReferenceUrls[0]
                        );
                        const shotNumber = 1000 + gp.pageNumber - 1;
                        await saveStoryboardImage(input.projectId, shotNumber, imageUrl, gp.masterPrompt);
                        results.push({ pageNumber: gp.pageNumber, gridImageUrl: imageUrl });
                        console.log(`[PromptEngineer] Grid page ${gp.pageNumber} rendered.`);
                    } catch (err) {
                        console.error(`[PromptEngineer] Grid page ${gp.pageNumber} failed:`, err);
                    }
                }
            })();

            return {
                success: true,
                message: `🎬 Rendering ${gridPrompts.length} storyboard grid(s) in the background. Check storyboard tab shortly.`
            };
        }),
});
