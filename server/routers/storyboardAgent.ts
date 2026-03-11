import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { generateGridImage } from "../services/aiGeneration";
import { getProjectContent, saveStoryboardImage, getLockedCharacter } from "../db";
import { estimateCost } from "../services/pricingService";
import { logUsage } from "../services/ledgerService";

export const storyboardAgentRouter = router({
    autoStoryboardScene: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            sceneText: z.string()
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

            const content = await getProjectContent(input.projectId);
            const globalNotes = content?.globalDirectorNotes || "";
            const visualStyle = content?.visualStyle || "Cinematic";

            const lockedChar = await getLockedCharacter(input.projectId);
            const characterReferenceUrl = lockedChar ? lockedChar.imageUrl : undefined;

            // Stage 1: Parse the scene text into exactly 12 panels
            const prompt = `You are a professional storyboard artist. Take the following narrative scene and break it down into exactly 12 consecutive visual shots to form a 3x4 storyboard grid.

Scene: \n${input.sceneText}\n\n
Global Director Notes: ${globalNotes}
Visual Style: ${visualStyle}

Output JSON ONLY in exactly this schema:
{
  "shots": [
    {
      "frameNumber": <number 1 to 12>,
      "cameraAngle": "e.g. Wide Establishing Shot",
      "action": "Description of the visual action"
    }
  ]
}
The array MUST contain exactly 12 items. Make the actions direct, simple, and clear.`;

            console.log(`[StoryboardAgent] Analyzing scene for Project ${input.projectId}...`);
            const llmResult = await invokeLLM({
                messages: [{ role: "user", content: prompt }],
                responseFormat: { type: "json_object" }
            });
            const llmCost = estimateCost('gemini-1.5-flash', 1);
            await logUsage(input.projectId, ctx.user.id.toString(), 'gemini-1.5-flash', llmCost, 'AGENT_SCENE_BREAKDOWN');

            let parsed: { shots: Array<{ frameNumber: number; cameraAngle: string; action: string; }> };
            try {
                parsed = JSON.parse(llmResult.choices[0].message.content as string);
                if (!parsed.shots || !Array.isArray(parsed.shots)) {
                    throw new Error("Invalid output format from LLM");
                }
            } catch (error) {
                console.error("[StoryboardAgent] Failed to parse generated shots:", error);
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to break down scene into 12 shots" });
            }

            console.log(`[StoryboardAgent] Successfully generated ${parsed.shots.length} shots. Assembling Generic Storyboard Prompt...`);

            // Assemble the final prompt
            let masterPrompt = `[System/Framework Instructions] Create a 3x4 storyboard grid (12 panels total) showing the exact same character and environment provided in the attached reference images. Preserve the exact character identity, facial features, outfit, props, and location shown in the references. Maintain a consistent cinematic style, color grade, and lighting across all 12 panels. Do not alter or add new elements that are not specified.\n\n`;
            masterPrompt += `[Panel-by-Panel Descriptions] Please generate the following specific camera angles and actions for each frame:\n`;

            parsed.shots.forEach((s) => {
                masterPrompt += `Frame ${s.frameNumber || 0}: [${s.cameraAngle}] - [${s.action}]\n`;
            });

            masterPrompt += `\nOutput the final image as a single 16:9 aspect ratio storyboard sheet. Technical Style: ${visualStyle}`;

            // We offload generation so we don't block the UI
            (async () => {
                const uniqueShotNumber = 1000 + Math.floor(Math.random() * 10000); // 1000+ maps to grid paginated pages
                try {
                    console.log(`[StoryboardAgent] Triggering 3x4 Grid Generation...`);
                    const imageUrl = await generateGridImage(masterPrompt, input.projectId, ctx.user.id.toString(), characterReferenceUrl);
                    await saveStoryboardImage(input.projectId, uniqueShotNumber, imageUrl, masterPrompt);
                    console.log(`[StoryboardAgent] Grid Materialized -> ${imageUrl}`);
                } catch (err) {
                    console.error(`[StoryboardAgent] Grid generation failed:`, err);
                }
            })();

            return {
                success: true,
                message: "Auto-storyboarding initialized. 12-panel Grid will materialize shortly.",
                estimatedShots: 12
            };
        })
});
