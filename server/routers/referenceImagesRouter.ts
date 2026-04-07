import { 
  getReferenceImages, saveReferenceImage, deleteReferenceImage,
} from "../db";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";

export const referenceImagesRouter = router({
    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getReferenceImages(input.projectId);
      }),

    upload: publicProcedure
      .input(z.object({ projectId: z.number(), imageUrl: z.string(), description: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await saveReferenceImage(input.projectId, input.imageUrl, input.description);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ imageId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await deleteReferenceImage(input.imageId);
        return { success: true };
      }),
  });
