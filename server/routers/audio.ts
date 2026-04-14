import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { generateVoiceover } from "../services/elevenLabsIntegration";
import { epidemicSoundService } from "../services/epidemicSoundIntegration";
import { musicRecommendationEngine } from "../services/musicRecommendation";
import { generateSFX } from "../services/audioService";
import { getDb } from "../db";
import { audioAssets, brandVoiceProfiles } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { logUsage } from "../services/ledgerService";
import { estimateCost, validateCost } from "../services/pricingService";
import { TRPCError } from "@trpc/server";

export const audioRouter = router({
    generateDialogue: publicProcedure
        .input(z.object({
            projectId: z.number(),
            text: z.string().min(1),
            voiceProfileId: z.number().optional(),
            language: z.string().default("en"),
            speed: z.number().optional(),
            pitch: z.number().optional(),
            sceneId: z.number().optional(),
            force: z.boolean().default(false)
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

            // 1. Get Voice Profile
            let voiceProfile;
            if (input.voiceProfileId) {
                const profiles = await db.select().from(brandVoiceProfiles).where(eq(brandVoiceProfiles.id, input.voiceProfileId)).limit(1);
                voiceProfile = profiles[0];
            } else {
                // Default voice profile search (e.g. first one in project)
                const profiles = await db.select().from(brandVoiceProfiles).limit(1);
                voiceProfile = profiles[0];
            }

            if (!voiceProfile) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Voice profile not found. Please create one in Brand settings." });
            }

            // 2. Cost Estimate
            const estimatedCost = estimateCost('elevenlabs/tts', input.text.length / 1000); // 1 unit per 1k chars
            validateCost(estimatedCost, input.force);

            // 3. Generate
            const result = await generateVoiceover({
                script: input.text,
                voiceProfile: voiceProfile as any,
                language: input.language,
                speed: input.speed,
                pitch: input.pitch
            });

            // 4. Save to DB
            await db.insert(audioAssets).values({
                projectId: input.projectId,
                sceneId: input.sceneId || null,
                type: "DIALOGUE",
                url: result.audioUrl,
                label: input.text.substring(0, 50),
                duration: result.duration,
                metadata: result.metadata as any
            });

            // 5. Log Usage
            await logUsage(input.projectId, ctx.user?.id?.toString() || "system", 'elevenlabs/tts', estimatedCost, "VOICEOVER_GENERATION");

            return result;
        }),

    searchMusic: publicProcedure
        .input(z.object({
            query: z.string().optional(),
            mood: z.array(z.string()).optional(),
            genre: z.string().optional(),
            limit: z.number().default(20)
        }))
        .query(async ({ input }) => {
            return await epidemicSoundService.searchTracks(input);
        }),

    recommendMusic: publicProcedure
        .input(z.object({
            projectId: z.number(),
            limit: z.number().default(5)
        }))
        .query(async ({ input }) => {
            const { moodAnalysisService } = await import("../services/moodAnalysis");
            const projectMood = await moodAnalysisService.getProjectMood(input.projectId);

            return await musicRecommendationEngine.getRecommendations({
                projectMood,
                limit: input.limit
            });
        }),

    selectMusic: publicProcedure
        .input(z.object({
            projectId: z.number(),
            trackId: z.string(),
            sceneId: z.number().optional()
        }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

            const track = await epidemicSoundService.getTrackDetails(input.trackId);
            if (!track) throw new TRPCError({ code: "NOT_FOUND", message: "Track not found in Epidemic Sound library" });

            await db.insert(audioAssets).values({
                projectId: input.projectId,
                sceneId: input.sceneId || null,
                type: "MUSIC",
                url: track.preview_url, // Use preview for now, real download would be separate
                label: `${track.title} - ${track.artist}`,
                duration: track.duration * 1000,
                metadata: { trackId: track.id, genre: track.genre }
            });

            return { success: true };
        }),

    generateSFX: publicProcedure
        .input(z.object({
            projectId: z.number(),
            prompt: z.string().min(1),
            sceneId: z.number().optional()
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");

            // Cost Estimate - ElevenLabs SFX is slightly more expensive than AudioLDM
            const cost = estimateCost('elevenlabs/sfx', 1);
            validateCost(cost, false);

            const result = await generateSFX(input.prompt, input.projectId, ctx.user.id.toString());

            // Save to DB
            const db = await getDb();
            if (db) {
                await db.insert(audioAssets).values({
                    projectId: input.projectId,
                    sceneId: input.sceneId || null,
                    type: "SFX",
                    url: result.audioUrl,
                    label: input.prompt,
                    duration: 10000 // Default 10s as per audioService.ts
                });
            }

            // Log Usage
            await logUsage(input.projectId, ctx.user.id.toString(), 'elevenlabs/sfx', cost, "SFX_GENERATION");

            return result;
        }),

    getAvailableVoices: publicProcedure
        .query(async () => {
            const { getAvailableVoices } = await import("../services/elevenLabsIntegration");
            return await getAvailableVoices();
        })
});
