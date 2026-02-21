import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { generateCharacterArchetypes } from "../services/characterArchetypeGenerator";
import { generateVisualStyleGuide } from "../services/visualStyleGuideGenerator";

export const characterArchetypeRouter = router({
  // Generate character archetypes from brand guidelines
  generate: publicProcedure
    .input(z.object({
      brandId: z.string(),
      brandName: z.string(),
      targetCustomer: z.string(),
      aesthetic: z.string(),
      mission: z.string(),
      coreMessaging: z.string(),
      projectContext: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      try {
        const brand = {
          id: input.brandId,
          name: input.brandName,
          targetCustomer: input.targetCustomer,
          aesthetic: input.aesthetic,
          mission: input.mission,
          coreMessaging: input.coreMessaging,
        };
        const archetypes = await generateCharacterArchetypes(
          brand,
          input.projectContext || "Production project",
          4
        );

        return {
          success: true,
          archetypes,
          generatedAt: new Date(),
        };
      } catch (error) {
        console.error("Failed to generate character archetypes:", error);
        throw new Error("Failed to generate character archetypes");
      }
    }),

  // Regenerate a specific archetype variant
  regenerateVariant: publicProcedure
    .input(z.object({
      brandId: z.string(),
      archetypeIndex: z.number(),
      variantIndex: z.number(),
      brandName: z.string(),
      targetCustomer: z.string(),
      aesthetic: z.string(),
      mission: z.string(),
      coreMessaging: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      try {
        const brand = {
          id: input.brandId,
          name: input.brandName,
          targetCustomer: input.targetCustomer,
          aesthetic: input.aesthetic,
          mission: input.mission,
          coreMessaging: input.coreMessaging,
        };
        const archetypes = await generateCharacterArchetypes(
          brand,
          "Production project",
          4
        );

        if (input.archetypeIndex >= archetypes.length) {
          throw new Error("Invalid archetype index");
        }

        const archetype = archetypes[input.archetypeIndex];
        if (input.variantIndex >= archetype.variants.length) {
          throw new Error("Invalid variant index");
        }

        return {
          success: true,
          archetype,
          variantIndex: input.variantIndex,
          regeneratedAt: new Date(),
        };
      } catch (error) {
        console.error("Failed to regenerate character variant:", error);
        throw new Error("Failed to regenerate character variant");
      }
    }),

  // Select hero character from archetypes
  selectHeroCharacter: publicProcedure
    .input(z.object({
      projectId: z.number(),
      brandId: z.string(),
      archetypeIndex: z.number(),
      variantIndex: z.number(),
      characterName: z.string(),
      characterDescription: z.string(),
      imageUrl: z.string(),
      brandAlignment: z.number(),
    }))
    .mutation(async ({ input: _input, ctx }) => {
      void _input;
      if (!ctx.user) throw new Error("Unauthorized");

      try {
        // TODO: Save hero character to database
        // This would typically involve:
        // 1. Creating a character entry in the database
        // 2. Linking it to the project
        // 3. Marking it as the hero/primary character
        // 4. Storing the visual reference and metadata

        return {
          success: true,
          characterId: Math.floor(Math.random() * 10000),
          selectedAt: new Date(),
        };
      } catch (error) {
        console.error("Failed to select hero character:", error);
        throw new Error("Failed to select hero character");
      }
    }),
});

export const visualStyleGuideRouter = router({
  // Generate visual style guide from brand guidelines
  generate: publicProcedure
    .input(z.object({
      brandId: z.string(),
      brandName: z.string(),
      targetCustomer: z.string(),
      aesthetic: z.string(),
      mission: z.string(),
      coreMessaging: z.string(),
      moodboardImages: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      try {
        const brand = {
          id: input.brandId,
          name: input.brandName,
          targetCustomer: input.targetCustomer,
          aesthetic: input.aesthetic,
          mission: input.mission,
          coreMessaging: input.coreMessaging,
        };
        const styleGuide = await generateVisualStyleGuide(
          brand,
          input.projectContext || "Production project"
        );

        return {
          success: true,
          styleGuide,
          generatedAt: new Date(),
        };
      } catch (error) {
        console.error("Failed to generate visual style guide:", error);
        throw new Error("Failed to generate visual style guide");
      }
    }),

  // Regenerate specific sections of the style guide
  regenerateSection: publicProcedure
    .input(z.object({
      brandId: z.string(),
      section: z.enum(["colors", "typography", "textures", "composition"]),
      brandName: z.string(),
      targetCustomer: z.string(),
      aesthetic: z.string(),
      mission: z.string(),
      coreMessaging: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      try {
        const brand = {
          id: input.brandId,
          name: input.brandName,
          targetCustomer: input.targetCustomer,
          aesthetic: input.aesthetic,
          mission: input.mission,
          coreMessaging: input.coreMessaging,
        };
        const styleGuide = await generateVisualStyleGuide(
          brand,
          "Production project"
        );

        return {
          success: true,
          styleGuide,
          section: input.section,
          regeneratedAt: new Date(),
        };
      } catch (error) {
        console.error("Failed to regenerate style guide section:", error);
        throw new Error("Failed to regenerate style guide section");
      }
    }),
  // Save style guide to project
  save: publicProcedure
    .input(z.object({
      projectId: z.number(),
      brandId: z.string(),
      styleGuideData: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ input: _input, ctx }) => {
      void _input;
      if (!ctx.user) throw new Error("Unauthorized");

      try {
        // TODO: Save style guide to database
        // This would typically involve:
        // 1. Storing the style guide data
        // 2. Linking it to the project
        // 3. Creating associations with brand
        // 4. Storing visual references and metadata

        return {
          success: true,
          styleGuideId: Math.floor(Math.random() * 10000),
          savedAt: new Date(),
        };
      } catch (error) {
        console.error("Failed to save style guide:", error);
        throw new Error("Failed to save style guide");
      }
    }),

  // Get saved style guide for project
  get: publicProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input: _input, ctx: _ctx }) => {
      void _input;
      void _ctx;
      try {
        // TODO: Retrieve style guide from database
        return {
          styleGuide: null,
          exists: false,
        };
      } catch (error) {
        console.error("Failed to get style guide:", error);
        throw new Error("Failed to get style guide");
      }
    }),
});
