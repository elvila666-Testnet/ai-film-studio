import {
  getReferenceImages, saveReferenceImage, deleteReferenceImage,
  createEditorProject, getEditorProjectsByProjectId, getEditorClips, createEditorClip, updateEditorClip, deleteEditorClip, createEditorTrack, getEditorTracks, createEditorExport, getEditorExports, updateEditorExport, createComment, getClipComments, updateComment, deleteComment, getAnimaticConfig, updateFrameDurations, updateAnimaticAudio, getStoryboardFrameOrder, updateFrameOrder, getFrameHistory, createFrameHistoryVersion, getFrameNotes, saveFrameNotes, deleteFrameNotes,
  createCharacter, getCharacter, getProjectCharacters, getLockedCharacter, lockCharacter, unlockAllCharacters, updateCharacter, deleteCharacter
} from "../db";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";

export const editorRouter = router({
  projects: router({
    create: publicProcedure
      .input(z.object({ projectId: z.number(), title: z.string().min(1), description: z.string().optional(), fps: z.number().default(24), resolution: z.string().default("1920x1080") }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const result = await createEditorProject(input.projectId, {
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          fps: input.fps,
          resolution: input.resolution,
        } as any);
        return { success: true, editorProjectId: (result as any).insertId || 0 };
      }),

    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getEditorProjectsByProjectId(input.projectId);
      }),
  }),

  clips: router({
    list: publicProcedure
      .input(z.object({ editorProjectId: z.number() }))
      .query(async ({ input }) => {
        return getEditorClips(input.editorProjectId);
      }),

    upload: publicProcedure
      .input(z.object({
        editorProjectId: z.number(),
        trackId: z.number(),
        fileUrl: z.string(),
        fileName: z.string(),
        fileType: z.enum(["video", "audio", "image"]),
        duration: z.number(),
        order: z.number(),
        startTime: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const result = await createEditorClip({
          editorProjectId: input.editorProjectId,
          trackId: input.trackId,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          fileType: input.fileType,
          duration: input.duration,
          order: input.order,
          startTime: input.startTime || 0,
        });
        return { success: true, clipId: (result as any).insertId || 0 };
      }),

    update: publicProcedure
      .input(z.object({
        clipId: z.number(),
        trimStart: z.number().optional(),
        trimEnd: z.number().optional(),
        volume: z.number().optional(),
        startTime: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { clipId, ...updates } = input;
        await updateEditorClip(clipId, updates);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ clipId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await deleteEditorClip(input.clipId);
        return { success: true };
      }),

    updatePosition: publicProcedure
      .input(z.object({
        clipId: z.number(),
        startTime: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await updateEditorClip(input.clipId, { startTime: input.startTime });
        return { success: true };
      }),

    batchUpdatePositions: publicProcedure
      .input(z.object({
        updates: z.array(z.object({
          clipId: z.number(),
          startTime: z.number(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        for (const update of input.updates) {
          await updateEditorClip(update.clipId, { startTime: update.startTime });
        }
        return { success: true, count: input.updates.length };
      }),
  }),

  tracks: router({
    list: publicProcedure
      .input(z.object({ editorProjectId: z.number() }))
      .query(async ({ input }) => {
        return getEditorTracks(input.editorProjectId);
      }),

    create: publicProcedure
      .input(z.object({ editorProjectId: z.number(), trackType: z.enum(["video", "audio"]), trackNumber: z.number(), name: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const result = await createEditorTrack({
          editorProjectId: input.editorProjectId,
          trackType: input.trackType,
          trackNumber: input.trackNumber,
          name: input.name,
        });
        return { success: true, trackId: (result as any).insertId || 0 };
      }),
  }),

  export: router({
    list: publicProcedure
      .input(z.object({ editorProjectId: z.number() }))
      .query(async ({ input }) => {
        return getEditorExports(input.editorProjectId);
      }),

    create: publicProcedure
      .input(z.object({ editorProjectId: z.number(), format: z.enum(["mp4", "webm", "mov", "mkv"]), quality: z.enum(["720p", "1080p", "4k"]).default("1080p") }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const result = await createEditorExport({
          editorProjectId: input.editorProjectId,
          format: input.format,
          quality: input.quality,
          status: "pending",
        });
        return { success: true, exportId: (result as any).insertId || 0 };
      }),

    updateStatus: publicProcedure
      .input(z.object({ exportId: z.number(), status: z.string().optional(), exportUrl: z.string().optional(), error: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { exportId, ...updates } = input;
        await updateEditorExport(exportId, updates);
        return { success: true };
      }),
  }),

  comments: router({
    list: publicProcedure
      .input(z.object({ clipId: z.number() }))
      .query(async ({ input }) => {
        return getClipComments(input.clipId);
      }),

    create: publicProcedure
      .input(z.object({ clipId: z.number(), content: z.string(), timestamp: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await createComment({
          clipId: input.clipId,
          userId: ctx.user.id,
          content: input.content,
          timestamp: input.timestamp || 0,
        });
        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({ commentId: z.number(), content: z.string().optional(), resolved: z.boolean().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { commentId, ...updates } = input;
        await updateComment(commentId, updates);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await deleteComment(input.commentId);
        return { success: true };
      }),
  }),

  populateFromStoryboard: publicProcedure
    .input(z.object({ projectId: z.number(), editorProjectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const storyboardImages = await getStoryboardImages(input.projectId);
      const editorClipsToCreate = storyboardImages.map((img: { imageUrl: string }, index: number) => ({
        editorProjectId: input.editorProjectId,
        trackId: 1,
        fileUrl: img.imageUrl,
        fileName: `Storyboard Frame ${index + 1}`,
        fileType: "image" as const,
        duration: 2000,
        startTime: index * 2000,
        order: index + 1,
      }));

      for (const clip of editorClipsToCreate) {
        await createEditorClip(clip);
      }

      return { success: true, clipsCreated: editorClipsToCreate.length };
    }),

  exportAnimatic: publicProcedure
    .input(z.object({ projectId: z.number(), durationPerFrame: z.number().default(2), fps: z.number().default(24), resolution: z.string().default("1920x1080"), audioUrl: z.string().optional(), audioVolume: z.number().default(100), frameDurations: z.record(z.string(), z.number()).optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const { projectId, durationPerFrame, fps, resolution, audioUrl, audioVolume, frameDurations } = input;
      const { getDb } = await import("../db");
      const { projects, scenes, shots, generations } = await import("../../drizzle/schema");
      const { eq, inArray, desc } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) throw new Error("Database unreachable");

      // 1. Get all scenes ordered
      const sceneList = await db.select().from(scenes).where(eq(scenes.projectId, projectId)).orderBy(scenes.order);
      if (sceneList.length === 0) throw new Error("No scenes found for this project");

      // 2. Get all shots for these scenes
      const sceneIds = sceneList.map((s: { id: number }) => s.id);
      const shotList = await db.select().from(shots).where(inArray(shots.sceneId, sceneIds)).orderBy(shots.sceneId, shots.order);
      if (shotList.length === 0) throw new Error("No shots found for this project");

      // 3. Get latest generations for these shots
      const shotIds = shotList.map((s: { id: number }) => s.id);
      const latestGens = await db.select().from(generations).where(inArray(generations.shotId, shotIds)).orderBy(desc(generations.createdAt));

      // 4. Map images to shots (preserving scene->shot order)
      const imageUrls: string[] = [];
      const finalFrameDurations: Record<number, number> = {};

      let frameCount = 0;
      for (const scene of sceneList) {
        const sceneShots = shotList.filter((s: { sceneId: number }) => s.sceneId === scene.id);
        for (const shot of sceneShots) {
          const latestGen = latestGens.find((g: { shotId: number, imageUrl?: string }) => g.shotId === shot.id);
          if (latestGen?.imageUrl) {
            frameCount++;
            imageUrls.push(latestGen.imageUrl);
            // Map duration using the new relational ID if provided in input, else fallback to default
            if (frameDurations && frameDurations[shot.id.toString()]) {
              finalFrameDurations[frameCount] = frameDurations[shot.id.toString()];
            }
          }
        }
      }

      if (imageUrls.length === 0) {
        throw new Error("No generated visuals found for this project");
      }

      const { videoEditorService } = await import("../services/videoEditor");
      const localVideoPath = await videoEditorService.createAnimatic(imageUrls, durationPerFrame, fps, resolution, audioUrl, audioVolume, finalFrameDurations);

      const { storagePut } = await import("../storage");
      const fs = await import("fs/promises");
      const fileBuffer = await fs.readFile(localVideoPath);
      const { url: videoUrl } = await storagePut(`animatic/${projectId}-${Date.now()}.mp4`, fileBuffer, "video/mp4");

      await fs.unlink(localVideoPath).catch(() => { });

      return { success: true, videoUrl };
    }),

  getAnimaticConfig: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getAnimaticConfig(input.projectId);
    }),

  saveAnimaticConfig: publicProcedure
    .input(z.object({ projectId: z.number(), frameDurations: z.record(z.string(), z.number()).optional(), audioUrl: z.string().optional(), audioVolume: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const { projectId, frameDurations, audioUrl, audioVolume } = input;
      if (frameDurations) {
        const parsed = Object.entries(frameDurations).reduce((acc, [k, v]) => ({ ...acc, [parseInt(k)]: v }), {} as Record<number, number>);
        await updateFrameDurations(projectId, parsed);
      }
      if (audioUrl !== undefined) {
        await updateAnimaticAudio(projectId, audioUrl, audioVolume ?? 100);
      }
      return { success: true };
    }),

  getFrameOrder: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getStoryboardFrameOrder(input.projectId);
    }),

  updateFrameOrder: publicProcedure
    .input(z.object({ projectId: z.number(), frameOrders: z.array(z.object({ shotNumber: z.number(), displayOrder: z.number() })) }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      await updateFrameOrder(input.projectId, input.frameOrders);
      return { success: true };
    }),

  getFrameHistory: publicProcedure
    .input(z.object({ projectId: z.number(), shotNumber: z.number() }))
    .query(async ({ input }) => {
      return await getFrameHistory(input.projectId, input.shotNumber);
    }),

  createFrameVersion: publicProcedure
    .input(z.object({ projectId: z.number(), shotNumber: z.number(), imageUrl: z.string(), prompt: z.string(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      await createFrameHistoryVersion(input.projectId, input.shotNumber, input.imageUrl, input.prompt, input.notes);
      return { success: true };
    }),

  getFrameNotes: publicProcedure
    .input(z.object({ projectId: z.number(), shotNumber: z.number() }))
    .query(async ({ input }) => {
      return await getFrameNotes(input.projectId, input.shotNumber);
    }),

  saveFrameNotes: publicProcedure
    .input(z.object({ projectId: z.number(), shotNumber: z.number(), notes: z.string(), metadata: z.record(z.string(), z.any()).optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      await saveFrameNotes(input.projectId, input.shotNumber, input.notes, input.metadata);
      return { success: true };
    }),

  deleteFrameNotes: publicProcedure
    .input(z.object({ projectId: z.number(), shotNumber: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      await deleteFrameNotes(input.projectId, input.shotNumber);
      return { success: true };
    }),
});
