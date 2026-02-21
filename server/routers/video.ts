import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { addVideoExportJob, getVideoQueue } from "../queue/videoQueue";
import path from "path";
import fs from "fs";
import { getDb } from "../db";
import { generatedVideos, storyboardImages, modelConfigs } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { ProviderFactory } from "../services/providers/providerFactory";
import { VideoProvider } from "../services/providers/types";
import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import stream from "stream";
import { promisify } from "util";

const pipeline = promisify(stream.pipeline);
const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || "ai-film-studio-assets";

export const videoRouter = router({
    render: publicProcedure
        .input(z.object({
            storyboardId: z.string(),
            projectId: z.number(), // Added projectId
            format: z.enum(["mp4", "webm"]).default("mp4"),
            resolution: z.string().optional()
        }))
        .mutation(async ({ input }) => {
            // Mocking the input file generation for now
            // In production, this would fetch clips from DB and create a concat list
            const mockInputFile = path.resolve("./temp/mock_input.txt");
            // Ensure directory exists
            const tempDir = path.dirname(mockInputFile);
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            // Create a dummy file if it doesn't exist so the worker doesn't crash immediately
            if (!fs.existsSync(mockInputFile)) {
                fs.writeFileSync(mockInputFile, "file 'clip1.mp4'\nfile 'clip2.mp4'");
            }

            const outputFile = path.resolve(`./dist/exports/${input.projectId}_${input.storyboardId}.${input.format}`);

            try {
                const job = await addVideoExportJob({
                    projectId: input.projectId.toString(),
                    storyboardId: input.storyboardId,
                    inputFile: mockInputFile,
                    outputFile: outputFile,
                    options: {
                        codec: input.format === 'mp4' ? 'h264' : 'h264', // simplistic
                        quality: 'medium',
                        audioCodec: 'aac',
                        audioBitrate: 128,
                        videoBitrate: 3000,
                        resolution: '1080p',
                        frameRate: 30,
                        preset: 'medium'
                    }
                });

                return {
                    jobId: job.id,
                    status: "queued",
                    message: "Video rendering queued successfully"
                };
            } catch (error) {
                console.error("Failed to queue video export:", error);
                throw new Error("Failed to queue video export. Ensure Redis is running.");
            }
        }),

    checkStatus: publicProcedure
        .input(z.object({ jobId: z.string() }))
        .query(async ({ input }) => {
            const queue = getVideoQueue();
            if (!queue) {
                return {
                    jobId: input.jobId,
                    status: "error",
                    message: "Queue system unavailable"
                };
            }

            const job = await queue.getJob(input.jobId);

            if (!job) {
                return {
                    jobId: input.jobId,
                    status: "not_found",
                    message: "Job not found"
                };
            }

            const state = await job.getState();
            const progress = job.progress;
            const result = job.returnvalue;
            const failedReason = job.failedReason;

            return {
                jobId: input.jobId,
                status: state, // completed, failed, active, waiting
                progress: progress,
                url: state === 'completed' && result ? `/exports/${path.basename(result.outputFile)}` : null,
                error: failedReason
            };
        }),

    list: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const videos = await db
                .select()
                .from(generatedVideos)
                .where(eq(generatedVideos.projectId, input.projectId))
                .orderBy(generatedVideos.createdAt);

            return videos.map((v: any) => ({
                id: v.id,
                status: v.status as "pending" | "completed" | "failed",
                videoUrl: v.videoUrl || undefined,
                provider: v.provider,
                modelId: v.modelId,
                createdAt: v.createdAt,
            }));
        }),

    animateFrame: publicProcedure
        .input(z.object({
            projectId: z.number(),
            shotNumber: z.number(),
            motionPrompt: z.string(),
            provider: z.enum(["veo3", "sora", "replicate"]).default("replicate"),
            modelId: z.string().optional(),
            duration: z.number().default(4),
            characterLocked: z.boolean().default(true),
            force: z.boolean().default(false),
        }))
        .mutation(async ({ input, ctx }) => {
            console.log(`[VideoRouter] Create mutation triggered`, { projectId: input.projectId, provider: input.provider, modelId: input.modelId });
            const db = await getDb();
            if (!db) {
                console.error(`[VideoRouter] Database not available`);
                throw new Error("Database not available");
            }

            // 1. Determine Provider & Model
            let provider = input.provider as VideoProvider;
            let modelId = input.modelId || "minimax/video-01";

            if (!provider) {
                // Default to Replicate if not specified
                provider = "replicate";
            }

            // Get API Key
            const config = await db.select().from(modelConfigs).where(and(
                eq(modelConfigs.provider, provider.charAt(0).toUpperCase() + provider.slice(1)),
                eq(modelConfigs.isActive, true)
            )).limit(1);

            const apiKey = config[0]?.apiKey || "";
            console.log(`[VideoRouter] Selected provider: ${provider}, modelId: ${modelId}, hasApiKey: ${!!apiKey}`);

            // 2. Instantiate Provider
            const videoProvider = ProviderFactory.createVideoProvider(provider, apiKey);

            // 2. Prepare Params
            let prompt = input.motionPrompt || "A cinematic scene";
            let imageUrl = "";

            const shot = await db.select().from(storyboardImages).where(and(
                eq(storyboardImages.projectId, input.projectId),
                eq(storyboardImages.shotNumber, input.shotNumber)
            )).limit(1);

            if (shot[0]) {
                imageUrl = shot[0].imageUrl;
                // If characterLocked, inject character consistency rules into motion prompt
                if (input.characterLocked) {
                    const { buildMotionPrompt } = await import("../services/characterLock");
                    const { getLockedCharacter } = await import("../db");
                    const lockedChar = await getLockedCharacter(input.projectId);
                    if (lockedChar) {
                        prompt = buildMotionPrompt(input.motionPrompt, {
                            characterId: lockedChar.id,
                            characterImageUrl: lockedChar.imageUrl,
                            characterDescription: lockedChar.description,
                        });
                    }
                }
            }

            if (!imageUrl) throw new Error("Storyboard image not found for this shot");

            // 3b. Estimate & Validate Cost (Financial Control)
            const { estimateCost, validateCost } = await import("../src/services/pricingService");
            const cost = estimateCost(modelId, 5); // Assuming 5 seconds duration
            validateCost(cost, input.force);
            console.log(`[VideoRouter] Cost verified: ${cost} USD`);

            // 4. Create DB Entry (Pending)
            const videoEntry = await db.insert(generatedVideos).values({
                projectId: input.projectId,
                provider,
                modelId,
                status: "pending",
            });
            const videoId = videoEntry[0].insertId;

            // 5. Generate (Async - ideally queued, but direct for now)
            // We run this without awaiting to return quickly, or await depending on UX.
            // For now, let's await to ensure it works, or fire-and-forget.
            // Fire-and-forget is better for UI responsiveness, but we need to handle errors.
            // Let's await for simplicity in V1 specific requirement verification.
            try {
                console.log(`[VideoRouter] Calling generateVideo for shot ${input.shotNumber}`);
                const result = await videoProvider.generateVideo({
                    prompt,
                    keyframeUrl: imageUrl,
                    duration: input.duration,
                    resolution: "720p", // Default
                    fps: 24,
                }, modelId);

                // 7. Asset Ownership: Download -> GCS (Mandated by Constitution)
                let finalVideoUrl = result.url;
                if (!result.url.includes("storage.googleapis.com")) {
                    try {
                        console.log(`[VideoRouter] Securing asset to GCS...`);
                        const response = await axios({
                            method: "GET",
                            url: result.url,
                            responseType: "stream",
                        });

                        const filename = `videos/${uuidv4()}.mp4`;
                        const file = storage.bucket(BUCKET_NAME).file(filename);
                        const writeStream = file.createWriteStream({
                            gzip: true,
                            metadata: { contentType: "video/mp4" },
                        });

                        await pipeline(response.data, writeStream);
                        finalVideoUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
                        console.log(`[VideoRouter] Asset secured: ${finalVideoUrl}`);

                        // Update DB with persistent URL
                        await db.update(generatedVideos)
                            .set({ videoUrl: finalVideoUrl })
                            .where(eq(generatedVideos.id, videoId));
                    } catch (gcsError) {
                        console.error("[VideoRouter] GCS Persistence failed (using raw link):", gcsError);
                    }
                }

                // 6. Update DB
                await db.update(generatedVideos)
                    .set({
                        status: "completed",
                        videoUrl: finalVideoUrl,
                        taskId: result.metadata?.id as string
                    })
                    .where(eq(generatedVideos.id, videoId));

                // 7. Update Storyboard if linked
                await db.update(storyboardImages)
                    .set({ videoUrl: finalVideoUrl })
                    .where(and(
                        eq(storyboardImages.projectId, input.projectId),
                        eq(storyboardImages.shotNumber, input.shotNumber)
                    ));

                // 8. Log Usage (Financial Control)
                const { usageLedger } = await import("../../drizzle/schema");
                await db.insert(usageLedger).values({
                    projectId: input.projectId,
                    userId: ctx.user?.id?.toString() || "system",
                    actionType: 'VIDEO_GEN',
                    modelId: modelId,
                    quantity: 1,
                    cost: (result.actualCost || cost).toString() as any,
                });

                return { success: true, videoUrl: finalVideoUrl, videoId };
            } catch (error: any) {
                console.error("Video creation failed:", error);
                await db.update(generatedVideos)
                    .set({ status: "failed", error: error.message })
                    .where(eq(generatedVideos.id, videoId));
                throw new Error(`Video generation failed: ${error.message}`);
            }
        }),

    animateAll: publicProcedure
        .input(z.object({
            projectId: z.number(),
            provider: z.string(),
            modelId: z.string(),
            motionIntensity: z.number().optional(),
            resolution: z.enum(["720p", "1080p", "4k"]).optional(),
        }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            // 1. Get all storyboard images without videos (or all?)
            // User request implies batch generating for the storyboard.
            const shots = await db.select().from(storyboardImages).where(eq(storyboardImages.projectId, input.projectId));

            const provider = input.provider as VideoProvider;

            // Get API Key (Reuse logic)
            const config = await db.select().from(modelConfigs).where(and(
                eq(modelConfigs.provider, provider.charAt(0).toUpperCase() + provider.slice(1)),
                eq(modelConfigs.isActive, true)
            )).limit(1);
            const apiKey = config[0]?.apiKey || "";
            const videoProvider = ProviderFactory.createVideoProvider(provider, apiKey);

            let triggeredCount = 0;

            // 2. Iterate and Generate
            // Ideally this pushes to a queue. We'll simulate by firing promises.
            for (const shot of shots) {
                if (!shot.imageUrl) continue;

                // Create DB Entry
                const videoEntry = await db.insert(generatedVideos).values({
                    projectId: input.projectId,
                    provider,
                    modelId: input.modelId,
                    status: "pending",
                });
                const videoId = videoEntry[0].insertId;

                // Fire and forget individual generation
                videoProvider.generateVideo({
                    prompt: shot.prompt || "Cinematic shot",
                    keyframeUrl: shot.imageUrl,
                    duration: 5,
                    resolution: input.resolution || "720p",
                    fps: 24,
                }, input.modelId).then(async (result) => {
                    await db.update(generatedVideos)
                        .set({ status: "completed", videoUrl: result.url })
                        .where(eq(generatedVideos.id, videoId));

                    await db.update(storyboardImages)
                        .set({ videoUrl: result.url })
                        .where(eq(storyboardImages.id, shot.id));
                }).catch(async (err) => {
                    console.error(`Batch video failed for shot ${shot.shotNumber}:`, err);
                    await db.update(generatedVideos)
                        .set({ status: "failed", error: err.message })
                        .where(eq(generatedVideos.id, videoId));
                });

                triggeredCount++;
            }

            return { success: true, triggered: triggeredCount, message: `Started generation for ${triggeredCount} shots` };
        })
});
