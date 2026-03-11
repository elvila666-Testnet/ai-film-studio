/**
 * Brand Management tRPC Router
 */

import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getBrand, getUserBrands, updateBrand, deleteBrand, getBrandAssets, addBrandAsset, deleteBrandAsset } from "../db/brands";

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
        logoUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { createBrand } = await import("../services/brandService");
      const brandId = await createBrand(ctx.user.id, input);
      return { id: brandId };
    }),

  // Link brand to project
  linkToProject: protectedProcedure
    .input(z.object({ brandId: z.string(), projectId: z.number() }))
    .mutation(async ({ input }) => {
      const { setProjectBrand } = await import("../db/projects");
      await setProjectBrand(input.projectId, input.brandId);
      return { success: true };
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
        logoUrl: z.string().url().optional(),
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
      const { ingestBrandIdentity } = await import("../services/brandService");
      return await ingestBrandIdentity(input.brandId, input.sourceUrl);
    }),

  /**
   * 🔍 SCRAPE DNA: Extract brand info from URL without creating a brand yet
   */
  scrapeDNA: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      const { scrapeBrandFromUrl } = await import("../services/brandScraper");
      const result = await scrapeBrandFromUrl(input.url);
      if (!result) throw new Error("Failed to extract brand DNA");
      return result;
    }),

  /**
   * 🌐 DISCOVER: Search the web and ingest brand identity from name
   */
  discover: protectedProcedure
    .input(z.object({
      brandId: z.string(),
      name: z.string().min(1)
    }))
    .mutation(async ({ input }) => {
      const { discoverBrand } = await import("../services/brandService");
      return await discoverBrand(input.brandId, input.name);
    }),

  // Analyze product images
  analyzeBrand: protectedProcedure
    .input(z.object({
      productImageUrls: z.array(z.string()),
      brandId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { BrandManagementService } = await import("../services/brandManagement");
      try {
        const analysis = await BrandManagementService.analyzeBrandIdentity(
          input.productImageUrls
        );

        // If brandId is provided, persist analysis to brand
        if (input.brandId) {
          await updateBrand(input.brandId, {
            brandVoice: analysis.brandVoice,
            visualIdentity: analysis.visualIdentity,
            colorPalette: analysis.colorPalette,
          });
        }

        return analysis;
      } catch (error: any) {
        if (error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED")) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Google Gemini API rate limit reached. Please try again in a few moments.",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to analyze brand identity",
        });
      }
    }),

  /**
   * 📤 REAL PRODUCT SCAN: Upload Image to GCS
   * Accepts base64 or raw buffer data
   */
  uploadProductImage: protectedProcedure
    .input(z.object({
      base64: z.string(),
      fileName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import("../storage");
      const name = input.fileName || `product-${Date.now()}.png`;
      const buffer = Buffer.from(input.base64.split(",")[1] || input.base64, "base64");

      const { url } = await storagePut(`brands/products/${name}`, buffer, "image/png");
      return { url };
    }),

  /**
   * 🧠 UPDATE BRAND IDENTITY: Persist DNA
   */
  updateIdentity: protectedProcedure
    .input(z.object({
      id: z.string(),
      brandVoice: z.string().optional(),
      visualIdentity: z.string().optional(),
      colorPalette: z.any().optional(),
      targetAudience: z.string().optional(),
      negativeConstraints: z.string().optional(),
      logoUrl: z.string().url().optional(),
    }))
    .mutation(async ({ input }) => {
      await updateBrand(input.id, input);
      return { success: true };
    }),

  /**
   * 🔬 INGEST ASSET DNA: Scrape personality from a library URL
   */
  ingestAssetDNA: protectedProcedure
    .input(z.object({
      brandId: z.string(),
      url: z.string().url()
    }))
    .mutation(async ({ input }) => {
      const { ingestBrandIdentity } = await import("../services/brandService");
      return await ingestBrandIdentity(input.brandId, input.url);
    }),

  /**
   * 📚 ASSET LIBRARY: List, Add, Delete Brand Assets
   */
  listAssets: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      return await getBrandAssets(input.brandId);
    }),

  addAsset: protectedProcedure
    .input(z.object({
      brandId: z.string(),
      assetType: z.enum(["PDF", "URL", "IMG"]),
      url: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await addBrandAsset(input.brandId, input.assetType, input.url, input.description);
      return { success: true };
    }),

  deleteAsset: protectedProcedure
    .input(z.object({ assetId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteBrandAsset(input.assetId);
      return { success: true };
    }),

  /**
   * 📤 UPLOAD ASSET: Generic upload for brand assets
   */
  uploadAsset: protectedProcedure
    .input(z.object({
      base64: z.string(),
      fileName: z.string(),
      mimeType: z.string().default("application/octet-stream"),
    }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import("../storage");
      const buffer = Buffer.from(input.base64.split(",")[1] || input.base64, "base64");

      const { url } = await storagePut(`brands/assets/${input.fileName}`, buffer, input.mimeType);
      return { url };
    }),
});
