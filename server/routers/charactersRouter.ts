import { 
  getReferenceImages, saveReferenceImage, deleteReferenceImage,
  createEditorProject, getEditorProjectsByProjectId, getEditorClips, createEditorClip, updateEditorClip, deleteEditorClip, createEditorTrack, getEditorTracks, createEditorExport, getEditorExports, updateEditorExport, createComment, getClipComments, updateComment, deleteComment, getAnimaticConfig, updateFrameDurations, updateAnimaticAudio, getStoryboardFrameOrder, updateFrameOrder, getFrameHistory, createFrameHistoryVersion, getFrameNotes, saveFrameNotes, deleteFrameNotes,
  createCharacter, getCharacter, getProjectCharacters, getLockedCharacter, lockCharacter, unlockAllCharacters, updateCharacter, deleteCharacter
} from "../db";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";

export const charactersRouter = router({
    create: publicProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string().min(1),
        description: z.string(),
        imageUrl: z.string(),
        isHero: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const characterId = await createCharacter(input.projectId, input);
        return { success: true, characterId };
      }),

    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getProjectCharacters(input.projectId);
      }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getCharacter(input.id);
      }),

    getLocked: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getLockedCharacter(input.projectId);
      }),

    lock: publicProcedure
      .input(z.object({
        projectId: z.number(),
        characterId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await lockCharacter(input.projectId, input.characterId);
        return { success: true };
      }),

    unlock: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await unlockAllCharacters(input.projectId);
        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        isHero: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { id, ...data } = input;
        await updateCharacter(id, data);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await deleteCharacter(input.id);
        return { success: true };
      }),
  });
