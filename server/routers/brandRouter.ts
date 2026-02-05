/**
 * Brand Management tRPC Router
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { createBrand, getBrand, getUserBrands, updateBrand, deleteBrand } from "../db";

export const brandRouter = router({
  // List user's brands
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserBrands(ctx.user.id);
  }),

  // Get single brand
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getBrand(input.id);
    }),

  // Create brand
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        targetCustomer: z.string().optional(),
        aesthetic: z.string().optional(),
        mission: z.string().optional(),
        coreMessaging: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const brandId = await createBrand(
        ctx.user.id,
        input.name,
        input.targetCustomer,
        input.aesthetic,
        input.mission,
        input.coreMessaging
      );
      return { id: brandId };
    }),

  // Update brand
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        targetCustomer: z.string().optional(),
        aesthetic: z.string().optional(),
        mission: z.string().optional(),
        coreMessaging: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateBrand(input.id, input);
      return { success: true };
    }),

  // Delete brand
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteBrand(input.id);
      return { success: true };
    }),
});
