import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { createProject, getUserProjects, getProject, getProjectContent, updateProjectContent, deleteProject, setProjectBrand } from "../db";
import { projects, shots, generations, scenes, type Scene, type Shot } from "../../drizzle/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { generateFCPXML } from "../services/exportService";

export const projectRouter = router({
    list: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.user) return [];
        return getUserProjects(ctx.user.id);
    }),

    create: publicProcedure
        .input(z.object({
            name: z.string().min(1),
            brandId: z.string().optional(),
            type: z.enum(["spot", "movie"]).default("movie"),
            targetDuration: z.number().optional(),
            aspectRatio: z.string().optional(),
            thumbnailUrl: z.string().optional(),
            brief: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");
            const projectId = await createProject(
                ctx.user.id,
                input.name,
                input.type,
                input.targetDuration,
                input.aspectRatio,
                input.thumbnailUrl,
                input.brief
            );
            if (input.brandId) {
                await setProjectBrand(projectId, input.brandId);
            }
            return { id: projectId, name: input.name };
        }),

    get: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            const project = await getProject(input.id);
            const content = await getProjectContent(input.id);
            return { project, content };
        }),

    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");
            await deleteProject(input.id);
            return { success: true };
        }),

    updateContent: publicProcedure
        .input(z.object({
            projectId: z.number(),
            brief: z.string().optional(),
            script: z.string().optional(),
            globalDirectorNotes: z.string().optional(),
            storyboardPrompts: z.string().optional(),
            technicalShots: z.string().optional(),
            masterVisual: z.string().optional(),
            brandVoice: z.string().optional(),
            visualIdentity: z.string().optional(),
            colorPalette: z.record(z.string()).optional(),
            castingValidated: z.boolean().optional(),
            cineValidated: z.boolean().optional(),
            pdValidated: z.boolean().optional(),
            castingApprovedOutput: z.string().optional(),
            cineApprovedOutput: z.string().optional(),
            pdApprovedOutput: z.string().optional(),
            technicalScriptStatus: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");
            const { projectId } = input;
            
            // Explicitly pick allowed keys to avoid passing unknown keys to DB
            const data: any = {};
            if (input.brief !== undefined) data.brief = input.brief;
            if (input.script !== undefined) data.script = input.script;
            if (input.globalDirectorNotes !== undefined) data.globalDirectorNotes = input.globalDirectorNotes;
            if (input.storyboardPrompts !== undefined) data.storyboardPrompts = input.storyboardPrompts;
            if (input.technicalShots !== undefined) data.technicalShots = input.technicalShots;
            if (input.masterVisual !== undefined) data.masterVisual = input.masterVisual;
            if (input.brandVoice !== undefined) data.brandVoice = input.brandVoice;
            if (input.visualIdentity !== undefined) data.visualIdentity = input.visualIdentity;
            if (input.colorPalette !== undefined) data.colorPalette = input.colorPalette;
            if (input.castingValidated !== undefined) data.castingValidated = input.castingValidated;
            if (input.cineValidated !== undefined) data.cineValidated = input.cineValidated;
            if (input.pdValidated !== undefined) data.pdValidated = input.pdValidated;
            if (input.castingApprovedOutput !== undefined) data.castingApprovedOutput = input.castingApprovedOutput;
            if (input.cineApprovedOutput !== undefined) data.cineApprovedOutput = input.cineApprovedOutput;
            if (input.pdApprovedOutput !== undefined) data.pdApprovedOutput = input.pdApprovedOutput;
            if (input.technicalScriptStatus !== undefined) data.technicalScriptStatus = input.technicalScriptStatus;

            try {
                await updateProjectContent(projectId, data);
                return { success: true };
            } catch (err: any) {
                console.error(`[ProjectRouter] Update failed for ${projectId}:`, err.message);
                throw new Error(err.message || "Failed to update project content");
            }
        }),

    // --- NEW: Project Bible Logic ---
    getBible: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            const project = await getProject(input.projectId);
            if (!project) throw new Error("Project not found");
            return project.bible || {};
        }),

    updateBible: publicProcedure
        .input(z.object({
            projectId: z.number(),
            bible: z.record(z.unknown()),
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db.update(projects)
                .set({ bible: input.bible })
                .where(eq(projects.id, input.projectId));

            return { success: true };
        }),

    toggleScriptLock: publicProcedure
        .input(z.object({ projectId: z.number(), isLocked: z.boolean() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db.update(projects)
                .set({ isScriptLocked: input.isLocked })
                .where(eq(projects.id, input.projectId));

            return { success: true };
        }),

    exportXml: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const project = await getProject(input.projectId);
            if (!project) throw new Error("Project not found");

            // Fetch shots with generations (simplified for now, just getting shots)
            // Ideally we join with generations table to get videoUrl
            // For this phase, let's assume we just want to export the structure
            // Or better, fetch shots and finding their best generation. 
            // Let's keep it simple: fetch shots.

            // Fetch scenes for the project to get scene IDs
            const projectScenes = await db.select().from(scenes).where(eq(scenes.projectId, input.projectId)).orderBy(scenes.order);
            const sceneIds = projectScenes.map((s: Scene) => s.id);

            if (sceneIds.length === 0) {
                const xmlUrl = await generateFCPXML(input.projectId, project.name, []);
                return { xmlUrl };
            }

            // Fetch shots for these scenes
            // Drizzle doesn't support "inArray" easily without importing it, so let's use a loop or refined query if possible.
            // importing inArray from drizzle-orm
            const projectShots = await db.select().from(shots).where(inArray(shots.sceneId, sceneIds)).orderBy(shots.order);

            // Enhanced: Fetch generations for these shots to get URLs
            // This is N+1 but acceptable for MVP export
            const shotsWithMedia = await Promise.all(projectShots.map(async (shot: Shot) => {
                const gens = await db.select().from(generations).where(eq(generations.shotId, shot.id)).orderBy(desc(generations.createdAt)).limit(1);
                const bestGen = gens[0];
                return {
                    id: shot.id,
                    title: shot.visualDescription || `Shot ${shot.order}`,
                    imageUrl: bestGen?.imageUrl || "", // Fallback or placeholder
                    videoUrl: null, // No video generation in schema yet explicitly linked as 'final'
                };
            }));

            // Filter out shots without media if we want strict export, or keep placeholders?
            // Reporting all shots is better for NLE structure.

            const xmlUrl = await generateFCPXML(input.projectId, project.name, shotsWithMedia);
            return { xmlUrl };
        }),

    exportNuke: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const project = await getProject(input.projectId);
            if (!project) throw new Error("Project not found");

            const { generateNukeScript } = await import("../services/exportService");

            // Fetch scenes and shots similar to exportXml
            const projectScenes = await db.select().from(scenes).where(eq(scenes.projectId, input.projectId)).orderBy(scenes.order);
            const sceneIds = projectScenes.map((s: Scene) => s.id);

            if (sceneIds.length === 0) {
                const nkUrl = await generateNukeScript(input.projectId, project.name, []);
                return { nkUrl };
            }

            const projectShots = await db.select().from(shots).where(inArray(shots.sceneId, sceneIds)).orderBy(shots.order);

            const shotsWithMedia = await Promise.all(projectShots.map(async (shot: Shot) => {
                const gens = await db.select().from(generations).where(eq(generations.shotId, shot.id)).orderBy(desc(generations.createdAt)).limit(1);
                const bestGen = gens[0];
                return {
                    id: shot.id,
                    title: shot.visualDescription || `Shot ${shot.order}`,
                    imageUrl: bestGen?.imageUrl || "",
                    videoUrl: null,
                };
            }));

            const nkUrl = await generateNukeScript(input.projectId, project.name, shotsWithMedia);
            return { nkUrl };
        }),

    uploadThumbnail: publicProcedure
        .input(z.object({
            base64: z.string(),
            fileName: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
            const { storagePut } = await import("../storage");
            const name = input.fileName || `thumbnail-${Date.now()}.png`;
            const buffer = Buffer.from(input.base64.split(",")[1] || input.base64, "base64");

            const { url } = await storagePut(`projects/thumbnails/${name}`, buffer, "image/png");
            return { url };
        }),
});
