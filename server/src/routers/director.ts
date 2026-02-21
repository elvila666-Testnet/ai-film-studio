import { z } from "zod";
import { router, publicProcedure } from "../../_core/trpc";
import { breakupScriptToScenes, breakupSceneToShots } from "../services/aiOrchestrator";
import { getDb } from "../../db";
import { scenes, shots, projectContent, generations, shotActors, actors, audioAssets, type Scene } from "../../../drizzle/schema";
import { eq, inArray, desc, and } from "drizzle-orm";

export const directorRouter = router({
    // Showrunner: Create Scenes from Script
    createScenes: publicProcedure
        .input(z.object({ projectId: z.number(), script: z.string() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");
            await breakupScriptToScenes(input.projectId, input.script, ctx.user.id.toString());
            return { success: true };
        }),

    getScenes: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database unreachable");
            return db.select().from(scenes).where(eq(scenes.projectId, input.projectId));
        }),

    // Director: Break Scene into Shots
    createShotList: publicProcedure
        .input(z.object({ sceneId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");
            const shots = await breakupSceneToShots(input.sceneId, ctx.user.id.toString());
            return { success: true, count: shots.length };
        }),

    getFullProductionLayout: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database unreachable");

            // 1. Get all scenes
            const sceneList = await db.select().from(scenes).where(eq(scenes.projectId, input.projectId)).orderBy(scenes.order);
            if (sceneList.length === 0) return [];

            // 2. Get all shots for these scenes
            const sceneIds = sceneList.map((s: Scene) => s.id);
            const shotList = await db.select().from(shots).where(inArray(shots.sceneId, sceneIds)).orderBy(shots.sceneId, shots.order);

            // 3. Get all latest generations for these shots
            if (shotList.length === 0) {
                return sceneList.map((s: Scene) => ({ ...s, shots: [] }));
            }

            const shotIds = shotList.map((s: any) => s.id);
            const gens = await db.select().from(generations).where(inArray(generations.shotId, shotIds)).orderBy(desc(generations.createdAt));

            // 3.5 Get all actor bindings for these shots
            const actorBindings = await db.select({
                shotId: shotActors.shotId,
                actorId: actors.id,
                name: actors.name,
                triggerWord: actors.triggerWord
            })
                .from(shotActors)
                .innerJoin(actors, eq(shotActors.actorId, actors.id))
                .where(inArray(shotActors.shotId, shotIds));

            // NEW: Get Storyboard Images
            const { storyboardImages } = await import("../../../drizzle/schema");
            const sImages = await db.select().from(storyboardImages).where(eq(storyboardImages.projectId, input.projectId));

            // 4. Assemble tree
            return sceneList.map((scene: Scene) => {
                const sceneShots = shotList.filter((s: any) => s.sceneId === scene.id).map((shot: any) => {
                    const latestGen = gens.find((g: any) => g.shotId === shot.id);
                    const sImg = sImages.find((img: any) => img.shotNumber === shot.order);
                    const shotAssignedActors = actorBindings.filter((a: any) => a.shotId === shot.id);

                    return {
                        ...shot,
                        imageUrl: sImg?.imageUrl || latestGen?.imageUrl || null,
                        masterImageUrl: sImg?.masterImageUrl || null,
                        imageId: sImg?.id || null, // pass the DB ID for approval
                        consistencyScore: sImg?.consistencyScore || null,
                        isConsistencyLocked: sImg?.isConsistencyLocked || false,
                        actors: shotAssignedActors
                    };
                });
                return {
                    ...scene,
                    shots: sceneShots
                };
            });
        }),

    getShots: publicProcedure
        .input(z.object({ sceneId: z.number() }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database unreachable");

            // Join with generations to get the latest image for each shot
            // select shots.*, generations.imageUrl from shots left join generations on ...
            // Simplified: Fetch all shots, then fetch all generations for these shots map them.

            const shotList = await db.select().from(shots).where(eq(shots.sceneId, input.sceneId));

            // Get generations for these shots
            if (shotList.length === 0) return [];

            const shotIds = shotList.map((s: any) => s.id);

            const gens = await db.select()
                .from(generations)
                .where(inArray(generations.shotId, shotIds))
                .orderBy(desc(generations.createdAt));

            // Map latest generation to shot
            return shotList.map((shot: any) => {
                const latestGen = gens.find((g: any) => g.shotId === shot.id);
                return {
                    ...shot,
                    imageUrl: latestGen?.imageUrl || null
                };
            });
        }),

    generateShotImage: publicProcedure
        .input(z.object({ shotId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");
            const db = await getDb();
            if (!db) throw new Error("Database unreachable");

            // 1. Get Shot Details
            const shotResult = await db.select().from(shots).where(eq(shots.id, input.shotId)).limit(1);
            const shot = shotResult[0];
            if (!shot) throw new Error("Shot not found");

            // 2. Get Project ID (via Scene)
            const sceneResult = await db.select().from(scenes).where(eq(scenes.id, shot.sceneId)).limit(1);
            const scene = sceneResult[0];
            if (!scene) throw new Error("Scene not found");

            // 3. Get Project Visual Style
            const projectContentResult = await db.select().from(projectContent).where(eq(projectContent.projectId, scene.projectId)).limit(1);
            const visualStyle = projectContentResult[0]?.masterVisual || "Cinematic film still, high quality.";

            // 3.5 Get Bound Actors for this shot
            const boundActors = await db.select({
                name: actors.name,
                triggerWord: actors.triggerWord,
                loraId: actors.loraId
            })
                .from(shotActors)
                .innerJoin(actors, eq(shotActors.actorId, actors.id))
                .where(eq(shotActors.shotId, shot.id));

            let characterPersona = "";
            let targetModelId: string | undefined = undefined;

            if (boundActors.length > 0) {
                characterPersona = boundActors.map((a: { name: string; triggerWord: string }) => `${a.name} (Trigger: ${a.triggerWord})`).join(", ");
                // If we have a LoRA ID, use it for the first actor found
                if (boundActors[0].loraId) {
                    targetModelId = boundActors[0].loraId;
                }
            }

            // 4. Synthesize High-Fidelity Prompt
            const { generateImagePromptForShot, generateStoryboardImage } = await import("../../services/aiGeneration");

            // Prepare shot object for the prompt engineer
            const promptInput = {
                shot: shot.order,
                tipo_plano: shot.cameraAngle || "Medium Shot",
                movimiento: shot.movement || "Static",
                tecnica: shot.lens || "Cinematic",
                iluminacion: shot.lighting || "Natural",
                audio: shot.audioDescription || "Ambient",
                accion: shot.visualDescription || "Action",
                intencion: "Narrative clarity"
            };

            const rawPrompt = await generateImagePromptForShot(promptInput, visualStyle, undefined, characterPersona);

            // Clean prompt: Extract [Visuals] or just strip tags
            let cleanPrompt = rawPrompt.replace(/\[Visuals\]/g, '').replace(/\[Dialogue\/Audio\].*$/s, '').trim();
            if (!cleanPrompt) cleanPrompt = rawPrompt; // Fallback

            // 5. Generate Image (Use Flux Dev or LoRA if specified)
            const imageUrl = await generateStoryboardImage(cleanPrompt, targetModelId || "Flux", scene.projectId, ctx.user.id.toString());

            // 6. Save Generation
            await db.insert(generations).values({
                shotId: shot.id,
                projectId: scene.projectId,
                imageUrl,
                prompt: cleanPrompt,
                model: targetModelId || "flux-dev",
                qualityTier: "fast",
                cost: "0.04",
            });

            return { success: true, imageUrl };
        }),

    getSceneAudio: publicProcedure
        .input(z.object({ sceneId: z.number() }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database unreachable");

            return db.select().from(audioAssets).where(eq(audioAssets.sceneId, input.sceneId));
        }),

    updateSceneAudio: publicProcedure
        .input(z.object({
            projectId: z.number(),
            sceneId: z.number(),
            url: z.string(),
            type: z.enum(["DIALOGUE", "SFX", "MUSIC"]),
            label: z.string().optional()
        }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database unreachable");

            // Simple insert for now, can be expanded to upsert or multiple assets
            await db.insert(audioAssets).values({
                projectId: input.projectId,
                sceneId: input.sceneId,
                url: input.url,
                type: input.type,
                label: input.label || `Scene ${input.type}`
            });

            return { success: true };
        }),

    listActors: publicProcedure
        .query(async ({ ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");
            const db = await getDb();
            if (!db) throw new Error("Database unreachable");

            return db.select().from(actors).where(eq(actors.userId, ctx.user.id));
        }),

    bindActorToShot: publicProcedure
        .input(z.object({ shotId: z.number(), actorId: z.number() }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database unreachable");

            // Check if already bound
            const existing = await db.select().from(shotActors).where(and(eq(shotActors.shotId, input.shotId), eq(shotActors.actorId, input.actorId))).limit(1);
            if (existing.length > 0) return { success: true };

            await db.insert(shotActors).values({ shotId: input.shotId, actorId: input.actorId });
            return { success: true };
        }),

    unbindActorFromShot: publicProcedure
        .input(z.object({ shotId: z.number(), actorId: z.number() }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database unreachable");

            await db.delete(shotActors).where(and(eq(shotActors.shotId, input.shotId), eq(shotActors.actorId, input.actorId)));
            return { success: true };
        }),

    getShotActors: publicProcedure
        .input(z.object({ shotId: z.number() }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database unreachable");

            return db.select({
                id: actors.id,
                name: actors.name,
                triggerWord: actors.triggerWord,
                loraId: actors.loraId
            })
                .from(shotActors)
                .innerJoin(actors, eq(shotActors.actorId, actors.id))
                .where(eq(shotActors.shotId, input.shotId));
        }),

    trainActor: publicProcedure
        .input(z.object({
            name: z.string(),
            triggerWord: z.string(),
            zipUrl: z.string()
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");
            const { trainLoRA } = await import("../services/replicateService");

            // Start training
            const training = await trainLoRA(ctx.user.id, input.zipUrl, input.triggerWord);

            // Save to DB
            const db = await getDb();
            if (db) {
                const { actors } = await import("../../../drizzle/schema");
                await db.insert(actors).values({
                    userId: ctx.user.id,
                    name: input.name,
                    triggerWord: input.triggerWord,
                    status: training.status,
                    trainingId: training.trainingId,
                    // loraId will be updated via webhook later
                });
            }

            return { success: true, trainingId: training.trainingId };
        }),
});
