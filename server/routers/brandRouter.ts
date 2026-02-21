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
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return getBrand(input.id);
    }),

  // Create brand
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        targetAudience: z.string().optional(),
        aesthetic: z.string().optional(),
        mission: z.string().optional(),
        coreMessaging: z.string().optional(),
        description: z.string().optional(),
        negativeConstraints: z.string().optional(),
        brandVoice: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const brandId = await createBrand(
        ctx.user.id,
        input.name,
        input.targetAudience,
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
        id: z.string(),
        name: z.string().min(1).optional(),
        targetAudience: z.string().optional(),
        aesthetic: z.string().optional(),
        mission: z.string().optional(),
        coreMessaging: z.string().optional(),
        description: z.string().optional(),
        negativeConstraints: z.string().optional(),
        brandVoice: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateBrand(input.id, input);
      return { success: true };
    }),

  // Delete brand
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await deleteBrand(input.id);
      return { success: true };
    }),

  // Generate brand archetypes
  generateArchetypes: protectedProcedure
    .input(z.object({ brandId: z.string(), count: z.number().optional() }))
    .mutation(async ({ input }) => {
      const brand = await getBrand(input.brandId);
      if (!brand) {
        throw new Error("Brand not found");
      }

      const { generateBrandArchetypes } = await import("../services/brandArchetypes");
      const archetypes = await generateBrandArchetypes(
        {
          id: brand.id,
          name: brand.name,
          targetCustomer: brand.targetAudience || undefined,
          aesthetic: brand.aesthetic || undefined,
          mission: brand.mission || undefined,
          coreMessaging: brand.coreMessaging || undefined,
        },
        input.count || 3
      );

      return { success: true, archetypes };
    }),

  // Ingest Identity (Gemini Powered)
  ingestIdentity: protectedProcedure
    .input(z.object({ brandId: z.string(), sourceUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      const { ingestBrandIdentity } = await import("../src/services/brandService");
      return await ingestBrandIdentity(input.brandId, input.sourceUrl);
    }),

  // Analyze product images
  analyzeBrand: protectedProcedure
    .input(z.object({
      productImageUrls: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      const { BrandManagementService } = await import("../services/brandManagement");
      const analysis = await BrandManagementService.analyzeBrandIdentity(
        input.productImageUrls
      );
      return analysis;
    }),
});
