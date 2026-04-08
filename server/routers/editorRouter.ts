import {
  createEditorProject,
  getEditorProjectsByProjectId,
  getEditorClips,
  createEditorClip,
  updateEditorClip,
  deleteEditorClip,
  splitEditorClip,
  createEditorTrack,
  getEditorTracks,
  deleteEditorTrack,
  createEditorKeyframe,
  getEditorKeyframes,
  deleteEditorKeyframe,
  createEditorTransition,
  getEditorTransitions,
  createEditorExport,
  getEditorExports,
  updateEditorExport,
  createComment,
  getClipComments,
  updateComment,
  deleteComment
} from "../db";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";

export const editorRouter = router({
  projects: router({
    create: publicProcedure
      .input(z.object({ 
        projectId: z.number(), 
        title: z.string().min(1), 
        description: z.string().optional(), 
        fps: z.number().default(24), 
        resolution: z.string().default("1920x1080") 
      }))
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
        duration: z.number().optional(),
        effects: z.any().optional(),
        colorCorrection: z.any().optional(),
        textOverlay: z.any().optional(),
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

    split: publicProcedure
      .input(z.object({
        clipId: z.number(),
        splitTime: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await splitEditorClip(input.clipId, input.splitTime);
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

  keyframes: router({
    list: publicProcedure
      .input(z.object({ clipId: z.number() }))
      .query(async ({ input }) => {
        return getEditorKeyframes(input.clipId);
      }),

    create: publicProcedure
      .input(z.object({
        clipId: z.number(),
        time: z.number(),
        property: z.string(),
        value: z.number(),
        easing: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const result = await createEditorKeyframe(input as any);
        return { success: true, keyframeId: (result as any).insertId || 0 };
      }),

    delete: publicProcedure
      .input(z.object({ keyframeId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await deleteEditorKeyframe(input.keyframeId);
        return { success: true };
      }),
  }),

  transitions: router({
    list: publicProcedure
      .input(z.object({ editorProjectId: z.number() }))
      .query(async ({ input }) => {
        return getEditorTransitions(input.editorProjectId);
      }),

    create: publicProcedure
      .input(z.object({
        editorProjectId: z.number(),
        fromClipId: z.number(),
        toClipId: z.number(),
        type: z.string(),
        duration: z.number(),
        easing: z.string().optional(),
        direction: z.string().optional(),
        parameters: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const result = await createEditorTransition(input as any);
        return { success: true, transitionId: (result as any).insertId || 0 };
      }),
  }),

  tracks: router({
    list: publicProcedure
      .input(z.object({ editorProjectId: z.number() }))
      .query(async ({ input }) => {
        return getEditorTracks(input.editorProjectId);
      }),

    create: publicProcedure
      .input(z.object({ 
        editorProjectId: z.number(), 
        trackType: z.enum(["video", "audio"]), 
        trackNumber: z.number(), 
        name: z.string().optional() 
      }))
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

    delete: publicProcedure
      .input(z.object({ trackId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await deleteEditorTrack(input.trackId);
        return { success: true };
      }),
  }),

  export: router({
    list: publicProcedure
      .input(z.object({ editorProjectId: z.number() }))
      .query(async ({ input }) => {
        return getEditorExports(input.editorProjectId);
      }),

    create: publicProcedure
      .input(z.object({ 
        editorProjectId: z.number(), 
        format: z.enum(["mp4", "webm", "mov", "mkv"]), 
        quality: z.enum(["720p", "1080p", "4k"]).default("1080p") 
      }))
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
      .input(z.object({ 
        exportId: z.number(), 
        status: z.string().optional(), 
        exportUrl: z.string().optional(), 
        error: z.string().optional() 
      }))
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
      .input(z.object({ 
        clipId: z.number(), 
        content: z.string(), 
        timestamp: z.number().optional() 
      }))
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
      .input(z.object({ 
        commentId: z.number(), 
        content: z.string().optional(), 
        resolved: z.boolean().optional() 
      }))
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
});
