import {
  createCharacter, getCharacter, getProjectCharacters, lockCharacter, unlockAllCharacters, updateCharacter, deleteCharacter
} from "../db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
      try {
        return await getProjectCharacters(input.projectId);
      } catch (err: unknown) {
        console.error("[CharactersRouter] List failed:", err);
        const message = err instanceof Error ? err.message : String(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Database error: ${message}`,
          cause: err
        });
      }
    }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getCharacter(input.id);
    }),

  getLocked: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const { getLockedCharacters } = await import("../db/characters");
      return getLockedCharacters(input.projectId);
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

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      referenceImageUrl: z.string().optional().nullable(),
      isHero: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        console.log(`[CharactersRouter] Update character ${input.id} started. Keys:`, Object.keys(input));
        const { id, ...data } = input;

        // If referenceImageUrl is a base64 string, upload it to GCS first
        if (data.referenceImageUrl && data.referenceImageUrl.startsWith('data:image/')) {
          console.log(`[CharactersRouter] Detected base64 reference image. Securing to GCS...`);
          const { uploadBase64Image } = await import("../_core/gcs");
          data.referenceImageUrl = await uploadBase64Image(data.referenceImageUrl, "characters/references");
          console.log(`[CharactersRouter] GCS secure successful: ${data.referenceImageUrl}`);
        }

        await updateCharacter(id, data);
        console.log(`[CharactersRouter] Update character ${id} successful.`);
        return { success: true };
      } catch (err: unknown) {
        console.error(`[CharactersRouter] Update failed for character ${input.id}:`, err);
        const message = err instanceof Error ? err.message : String(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Update failure: ${message}`,
          cause: err
        });
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      await deleteCharacter(input.id);
      return { success: true };
    }),
});
