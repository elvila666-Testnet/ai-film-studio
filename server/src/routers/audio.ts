import { z } from "zod";
import { router, publicProcedure } from "../../_core/trpc";
import { generateTTS, generateSFX } from "../services/audioService";
import { getDb } from "../../db";
import { audioAssets } from "../../../drizzle/schema";
import { logUsage } from "../services/ledgerService";
import { estimateCost } from "../services/pricingService";

export const audioRouter = router({
    generateTTS: publicProcedure
        .input(z.object({
            projectId: z.number(),
            text: z.string().min(1),
            voiceId: z.string().optional(),
            sceneId: z.number().optional()
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");

            const result = await generateTTS(input.text, input.voiceId, input.projectId);

            // Save to DB
            const db = await getDb();
            if (db) {
                await db.insert(audioAssets).values({
                    projectId: input.projectId,
                    sceneId: input.sceneId || null,
                    type: "DIALOGUE",
                    url: result.audioUrl,
                    label: input.text.substring(0, 50),
                    duration: result.duration
                });
            }

            // Log Usage
            const cost = estimateCost('elevenlabs/tts', 1);
            await logUsage(input.projectId, ctx.user.id.toString(), 'elevenlabs/tts', cost, "VOICEOVER_GENERATION");

            return result;
        }),

    generateSFX: publicProcedure
        .input(z.object({
            projectId: z.number(),
            prompt: z.string().min(1),
            sceneId: z.number().optional()
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");

            const result = await generateSFX(input.prompt, input.projectId, ctx.user.id.toString());

            // Save to DB
            const db = await getDb();
            if (db) {
                await db.insert(audioAssets).values({
                    projectId: input.projectId,
                    sceneId: input.sceneId || null,
                    type: "SFX",
                    url: result.audioUrl,
                    label: input.prompt
                });
            }

            // Log Usage
            const cost = estimateCost('haoheliu/audioldm-2', 1);
            await logUsage(input.projectId, ctx.user.id.toString(), 'haoheliu/audioldm-2', cost, "SFX_GENERATION");

            return result;
        })
});
