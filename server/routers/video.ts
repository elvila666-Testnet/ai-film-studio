import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../_core/trpc";
import { addVideoExportJob, getVideoQueue } from "../queue/videoQueue";
import path from "path";
import fs from "fs";
import { getDb } from "../db";
import { generatedVideos, storyboardImages, modelConfigs } from "../../drizzle/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { ProviderFactory } from "../services/providers/providerFactory";
import { VideoProvider } from "../services/providers/types";

export const videoRouter = router({
    render: publicProcedure
        .input(z.object({
            storyboardId: z.string(),
            projectId: z.number(), // Added projectId
            format: z.enum(["mp4", "webm"]).default("mp4"),
            resolution: z.enum(["720p", "1080p", "4k", "2k"]).optional()
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
                        resolution: input.resolution || '1080p',
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
                    message: "Queue system unavailable",
                    progress: 0,
                    url: null,
                    error: "Queue system unavailable"
                };
            }

            const job = await queue.getJob(input.jobId);

            if (!job) {
                return {
                    jobId: input.jobId,
                    status: "not_found",
                    message: "Job not found",
                    progress: 0,
                    url: null,
                    error: "Job not found"
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
            motionPrompt: z.string().optional(),
            provider: z.enum(["veo3", "sora", "replicate", "gemini", "flow", "kling", "whan", "kie"]).default("replicate"),
            modelId: z.string().optional(),
            duration: z.number().default(4),
            resolution: z.enum(["720p", "1080p", "4k"]).default("720p"),
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
            let modelId: string = input.modelId || (provider === "veo3" ? "veo-3.0-generate-001" : "minimax/video-01");


            // Get API Key
            const normalizedProvider = provider.toLowerCase();
            const searchProviders = [
                provider, 
                provider.charAt(0).toUpperCase() + provider.slice(1), 
                provider.toUpperCase()
            ];
            
            // Special cases
            if (normalizedProvider === "veo3") searchProviders.push("Google");
            if (normalizedProvider === "kie") searchProviders.push("Kie", "KIE");

            const config = await db.select().from(modelConfigs).where(and(
                inArray(modelConfigs.provider, searchProviders),
                eq(modelConfigs.isActive, true)
            )).limit(1);

            let apiKey = config[0]?.apiKey || "";
            if (!modelId && config[0]?.modelId) {
                modelId = config[0].modelId;
            }

            if (!apiKey) {
                if (provider === "replicate") apiKey = process.env.REPLICATE_API_TOKEN || "";
                else if (provider === "sora") apiKey = process.env.SORA_API_KEY || "";
                else if (provider === "veo3" || (provider as any) === "gemini") apiKey = process.env.BUILT_IN_FORGE_API_KEY || "";
                else if (provider === "kie") apiKey = process.env.KIE_API_KEY || "";
            }

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

            if (!shot[0] || !shot[0].imageUrl) {
                console.warn(`[VideoRouter] Shot ${input.shotNumber} not found for project ${input.projectId}`);
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: `Shot #${input.shotNumber} not found. Please materialize the storyboard frame first.`
                });
            }

            imageUrl = shot[0].imageUrl;
            
            // If characterLocked, inject character consistency rules into motion prompt
            if (input.characterLocked) {
                const { buildMotionPrompt } = await import("../services/characterLock");
                const { getLockedCharacter } = await import("../db");
                const lockedChar = await getLockedCharacter(input.projectId);
                if (lockedChar) {
                    prompt = buildMotionPrompt(prompt, {
                        id: lockedChar.id,
                        imageUrl: lockedChar.imageUrl,
                        description: lockedChar.description,
                    } as any);
                }
            }

            // 3b. Estimate & Validate Cost (Financial Control)
            const { estimateCost, validateCost } = await import("../services/pricingService");
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
            const videoId = videoEntry[0]?.insertId;
            if (!videoId) {
                console.error("[VideoRouter] Critical Error: Failed to insert video entry or retrieve insertId.");
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to initialize video generation record in database."
                });
            }

            // 5. Generate (Async)
            try {
                console.log(`[VideoRouter] Calling generateVideo for shot ${input.shotNumber} with provider ${provider}`);
                const result = await videoProvider.generateVideo({
                    prompt,
                    model: modelId,
                    keyframeUrl: imageUrl,
                    duration: input.duration,
                    resolution: input.resolution,
                    fps: 24,
                });

                // 7. Asset Ownership: Download -> GCS (Mandated by Constitution)
                const { ensurePermanentUrl } = await import("../services/aiGeneration");
                const finalVideoUrl = await ensurePermanentUrl(result.url, "videos");
                if (!finalVideoUrl || finalVideoUrl.trim() === "") {
                    console.error("[VideoRouter] CRITICAL ERROR: Asset secured is blank! Extracted URL was empty. Raw KI response:", JSON.stringify((result.metadata as any)?.rawResponse));
                }
                console.log(`[VideoRouter] Asset secured: ${finalVideoUrl}`);

                // Update DB with persistent URL
                await db.update(generatedVideos)
                    .set({ videoUrl: finalVideoUrl })
                    .where(eq(generatedVideos.id, videoId));

                // 6. Update DB
                await db.update(generatedVideos)
                    .set({
                        status: "completed",
                        videoUrl: finalVideoUrl,
                        taskId: (result.metadata as any)?.id as string || (result.metadata as any)?.predictionId as string
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
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Video generation failed: ${error.message || String(error)}`
                });
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
                }, input.modelId).then(async (result: any) => {
                    await db.update(generatedVideos)
                        .set({ status: "completed", videoUrl: result.url })
                        .where(eq(generatedVideos.id, videoId));

                    await db.update(storyboardImages)
                        .set({ videoUrl: result.url })
                        .where(eq(storyboardImages.id, shot.id));
                }).catch(async (err: any) => {
                    console.error(`Batch video failed for shot ${shot.shotNumber}:`, err);
                    await db.update(generatedVideos)
                        .set({ status: "failed", error: err.message })
                        .where(eq(generatedVideos.id, videoId));
                });

                    triggeredCount++;
            }

            return { success: true, triggered: triggeredCount, message: `Started generation for ${triggeredCount} shots` };
        }),

    // ─── Video Version History (for version switching) ────────────────
    getVideoHistory: publicProcedure
        .input(z.object({
            projectId: z.number(),
            shotNumber: z.number(),
        }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            // Get all storyboard image variants for this shot (includes videoUrl)
            const { getShotVariants } = await import("../db/storyboard");
            const variants = await getShotVariants(input.projectId, input.shotNumber);

            // Also get all generated_videos entries for this project
            const { desc } = await import("drizzle-orm");
            const videos = await db.select()
                .from(generatedVideos)
                .where(and(
                    eq(generatedVideos.projectId, input.projectId),
                    eq(generatedVideos.status, "completed")
                ))
                .orderBy(desc(generatedVideos.createdAt));

            return {
                variants: variants.map((v: { id: number; imageUrl: string | null; videoUrl: string | null; prompt: string | null; generationVariant: number | null; createdAt: Date }) => ({
                    id: v.id,
                    imageUrl: v.imageUrl,
                    videoUrl: v.videoUrl,
                    prompt: v.prompt,
                    variant: v.generationVariant,
                    createdAt: v.createdAt,
                })),
                videos: videos.map((v: typeof generatedVideos.$inferSelect) => ({
                    id: v.id,
                    videoUrl: v.videoUrl,
                    modelId: v.modelId,
                    status: v.status,
                    createdAt: v.createdAt,
                })),
            };
        }),

    // ─── Director Revision: Full Pipeline (Image → Video) ─────────────
    directorRevision: publicProcedure
        .input(z.object({
            projectId: z.number(),
            shotNumber: z.number(),
            directorNotes: z.string().min(1),
            regenerateImage: z.boolean().default(true),
            regenerateVideo: z.boolean().default(true),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const userId = (ctx.user as { id: number } | undefined)?.id?.toString() || "system";
            let newImageUrl: string | undefined;

            console.log(`[DirectorRevision] Shot ${input.shotNumber}: "${input.directorNotes}"`);

            // ─── Phase 1: Regenerate Storyboard Image with Director Notes ───
            if (input.regenerateImage) {
                try {
                    console.log(`[DirectorRevision] Phase 1: Regenerating storyboard frame...`);

                    // Get current frame
                    const currentFrame = await db.select().from(storyboardImages).where(and(
                        eq(storyboardImages.projectId, input.projectId),
                        eq(storyboardImages.shotNumber, input.shotNumber)
                    )).limit(1);

                    const basePrompt = currentFrame[0]?.prompt || "Cinematic shot";
                    const parentImageUrl = currentFrame[0]?.imageUrl || undefined;

                    // Build director-enhanced prompt
                    const refinedPrompt = `DIRECTOR REVISION: ${input.directorNotes}\n\nOriginal brief: ${basePrompt}\n\nMaintain visual continuity. Only modify what the director has requested. Technical Style: 8K RAW cinematic photograph.`;

                    // Get character/set anchors for consistency
                    const { getLockedCharacters } = await import("../db/characters");
                    const lockedChars = await getLockedCharacters(input.projectId) || [];
                    const imageAnchors: string[] = [];
                    if (parentImageUrl) imageAnchors.push(parentImageUrl);
                    if (lockedChars.length > 0 && lockedChars[0].imageUrl) {
                        imageAnchors.push(lockedChars[0].imageUrl);
                    }

                    // Generate new image
                    const { generateStoryboardImage } = await import("../services/aiGeneration");
                    newImageUrl = await generateStoryboardImage(
                        refinedPrompt,
                        "nano-banana-pro", // Using Nano-Banana Pro via Replicate for Director Revisions
                        input.projectId,
                        userId,
                        "1344x768",
                        imageAnchors.slice(0, 3)
                    );

                    // Save as new variant + update current
                    const { saveNewShotVariant } = await import("../db/storyboard");
                    await saveNewShotVariant(input.projectId, input.shotNumber, newImageUrl, refinedPrompt);

                    // Also update the main storyboard entry
                    await db.update(storyboardImages)
                        .set({ imageUrl: newImageUrl, prompt: refinedPrompt, videoUrl: null })
                        .where(and(
                            eq(storyboardImages.projectId, input.projectId),
                            eq(storyboardImages.shotNumber, input.shotNumber),
                            eq(storyboardImages.generationVariant, 0)
                        ));

                    console.log(`[DirectorRevision] Phase 1 complete: ${newImageUrl}`);
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : String(err);
                    console.error(`[DirectorRevision] Phase 1 failed:`, message);
                    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Image regeneration failed: ${message}` });
                }
            }

            // ─── Phase 2: Re-Animate the Shot ───────────────────────────────
            let videoUrl: string | undefined;
            if (input.regenerateVideo) {
                try {
                    console.log(`[DirectorRevision] Phase 2: Re-animating shot...`);

                    // Get the frame to animate (use new image if available)
                    const frameToAnimate = await db.select().from(storyboardImages).where(and(
                        eq(storyboardImages.projectId, input.projectId),
                        eq(storyboardImages.shotNumber, input.shotNumber)
                    )).limit(1);

                    const keyframeUrl = newImageUrl || frameToAnimate[0]?.imageUrl;
                    if (!keyframeUrl) {
                        throw new Error("No keyframe image available for animation");
                    }

                    const motionPrompt = `${frameToAnimate[0]?.prompt || "Cinematic scene"}\n\n[DIRECTOR NOTES]: ${input.directorNotes}`;

                    // Create video provider
                    // Create video provider with proper API key
                    const vProviderName = "replicate"; // Default for director revision
                    const vConfig = await db.select().from(modelConfigs).where(and(
                        eq(modelConfigs.category, "video"),
                        eq(modelConfigs.isActive, true)
                    )).limit(1);
                    
                    const vApiKey = vConfig[0]?.apiKey || process.env.REPLICATE_API_TOKEN || "";
                    const videoProvider = ProviderFactory.createVideoProvider(vProviderName, vApiKey);
                    const vModelId = vConfig[0]?.modelId || "minimax/video-01";

                    const result = await videoProvider.generateVideo({
                        prompt: motionPrompt,
                        model: vModelId,
                        keyframeUrl,
                        duration: 8,
                        resolution: "720p",
                        fps: 24,
                    });

                    // Secure asset
                    const { ensurePermanentUrl } = await import("../services/aiGeneration");
                    videoUrl = await ensurePermanentUrl(result.url, "videos");

                    // Update storyboard
                    await db.update(storyboardImages)
                        .set({ videoUrl })
                        .where(and(
                            eq(storyboardImages.projectId, input.projectId),
                            eq(storyboardImages.shotNumber, input.shotNumber)
                        ));

                    // Log to generated_videos
                    await db.insert(generatedVideos).values({
                        projectId: input.projectId,
                        provider: "veo3",
                        modelId,
                        status: "completed",
                        videoUrl,
                    });

                    // Log cost
                    const { usageLedger } = await import("../../drizzle/schema");
                    await db.insert(usageLedger).values({
                        projectId: input.projectId,
                        userId,
                        actionType: "DIRECTOR_REVISION_VIDEO",
                        modelId,
                        quantity: 1,
                        cost: "0.18" as unknown as number,
                    });

                    console.log(`[DirectorRevision] Phase 2 complete: ${videoUrl}`);
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : String(err);
                    console.error(`[DirectorRevision] Phase 2 failed:`, message);
                    // Non-fatal: image was still regenerated
                }
            }

            return {
                success: true,
                imageUrl: newImageUrl,
                videoUrl,
                message: `Director revision complete for Shot ${input.shotNumber}`,
            };
        }),
});
