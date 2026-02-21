/**
 * tRPC Routers for Casting System
 * Handles character libraries, moodboards, and voiceovers
 */

import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as characterLibraryDb from "../db/characterLibrary";
import * as moodboardsDb from "../db/moodboards";
import * as voiceProfilesDb from "../db/voiceProfiles";
import * as characterSuggestion from "../services/characterSuggestion";
import * as moodboardAnalysis from "../services/moodboardAnalysis";
import * as elevenLabs from "../services/elevenLabsIntegration";
import { getBrand } from "../db";
import { trainCharacterModel, checkActorStatus } from "../services/castingService";

export const castingRouter = router({
  // Character Library Routes
  characterLibrary: router({
    create: protectedProcedure
      .input(
        z.object({
          brandId: z.string(),
          name: z.string(),
          description: z.string(),
          imageUrl: z.string(),
          traits: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const brand = await getBrand(input.brandId);
        if (!brand || brand.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        const characterId = await characterLibraryDb.createCharacterInLibrary(
          input.brandId,
          {
            name: input.name,
            description: input.description,
            imageUrl: input.imageUrl,
            traits: input.traits,
            isLocked: false,
          }
        );

        return { id: characterId };
      }),

    list: protectedProcedure
      .input(z.object({ brandId: z.string() }))
      .query(async ({ input, ctx }) => {
        const brand = await getBrand(input.brandId);
        if (!brand || brand.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        return characterLibraryDb.getBrandCharacterLibrary(input.brandId);
      }),

    get: protectedProcedure
      .input(z.object({ characterId: z.number() }))
      .query(async ({ input }) => {
        return characterLibraryDb.getCharacterFromLibrary(input.characterId);
      }),

    update: protectedProcedure
      .input(
        z.object({
          characterId: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          imageUrl: z.string().optional(),
          traits: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await characterLibraryDb.updateCharacterInLibrary(input.characterId, {
          name: input.name,
          description: input.description,
          imageUrl: input.imageUrl,
          traits: input.traits,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ characterId: z.number() }))
      .mutation(async ({ input }) => {
        await characterLibraryDb.deleteCharacterFromLibrary(input.characterId);
        return { success: true };
      }),

    lock: protectedProcedure
      .input(z.object({ characterId: z.number() }))
      .mutation(async ({ input }) => {
        await characterLibraryDb.lockCharacterInLibrary(input.characterId);
        return { success: true };
      }),

    unlock: protectedProcedure
      .input(z.object({ characterId: z.number() }))
      .mutation(async ({ input }) => {
        await characterLibraryDb.unlockCharacterInLibrary(input.characterId);
        return { success: true };
      }),

    suggestForScript: protectedProcedure
      .input(
        z.object({
          brandId: z.string(),
          script: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const brand = await getBrand(input.brandId);
        if (!brand || brand.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        const library = await characterLibraryDb.getBrandCharacterLibrary(input.brandId);
        const brandGuidelines = {
          id: brand.id,
          name: brand.name,
          targetCustomer: brand.targetCustomer || "",
          aesthetic: brand.aesthetic || "",
          mission: brand.mission || "",
          coreMessaging: brand.coreMessaging || "",
        };

        return characterSuggestion.suggestCharactersForScript(
          brandGuidelines as any,
          input.script,
          library
        );
      }),

    generatePoses: protectedProcedure
      .input(
        z.object({
          characterId: z.number(),
          poses: z.array(z.enum(["Close-up", "Medium Shot", "Full Body"])),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const character = await characterLibraryDb.getCharacterFromLibrary(input.characterId);
        if (!character) {
          throw new Error("Character not found");
        }

        const brand = await getBrand(character.brandId);
        if (!brand || brand.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        const { generateCharacterPose } = await import("../services/aiGeneration");

        const results: Record<string, string> = {};
        const currentPoses = character.poses ? JSON.parse(character.poses) : {};

        // Generate each requested pose in parallel (or serial if we want to be nice to rate limits)
        await Promise.all(input.poses.map(async (pose) => {
          try {
            const url = await generateCharacterPose({ imageUrl: character.imageUrl, traits: character.traits }, pose);
            results[pose] = url;
          } catch (err) {
            console.error(`Failed to generate pose ${pose}:`, err);
          }
        }));

        // Merge with existing poses
        const updatedPoses = { ...currentPoses, ...results };

        await characterLibraryDb.updateCharacterInLibrary(input.characterId, {
          poses: JSON.stringify(updatedPoses)
        });

        return { success: true, poses: updatedPoses };
      }),

    // Generate character options based on brand
    generateOptions: protectedProcedure
      .input(
        z.object({
          brandId: z.string(),
          targetDemographic: z.string(),
          count: z.number().default(4),
        })
      )
      .mutation(async ({ input }) => {
        const { getBrand } = await import("../db");
        const brand = await getBrand(input.brandId);
        if (!brand) throw new Error("Brand not found");

        const { BrandManagementService } = await import(
          "../services/brandManagement"
        );
        const options = await BrandManagementService.generateCharacterOptions(
          {
            brandVoice: brand.brandVoice || "Professional",
            visualIdentity: brand.visualIdentity || "Cinematic",
            colorPalette: (brand.colorPalette as any) || {},
            keyVisualElements: [], // Could be expanded
          },
          input.targetDemographic,
          input.count
        );

        return options;
      }),
  }),

  // Moodboard Routes
  moodboard: router({
    // ... existing ...
    generateMoodboard: protectedProcedure
      .input(z.object({ brandId: z.string(), style: z.string() }))
      .mutation(async ({ input }) => {
        const { getBrand } = await import("../db");
        const brand = await getBrand(input.brandId);
        if (!brand) throw new Error("Brand not found");

        const { BrandManagementService } = await import(
          "../services/brandManagement"
        );
        const imageUrl = await BrandManagementService.generateMoodboard(
          {
            brandVoice: brand.brandVoice || "Professional",
            visualIdentity: brand.visualIdentity || "Cinematic",
            colorPalette: (brand.colorPalette as any) || {},
            keyVisualElements: [],
          },
          input.style
        );

        return { imageUrl };
      }),
    create: protectedProcedure
      .input(
        z.object({
          brandId: z.string(),
          name: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const brand = await getBrand(input.brandId);
        if (!brand || brand.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        const moodboardId = await moodboardsDb.createMoodboard(input.brandId, {
          name: input.name,
          description: input.description,
        });

        return { id: moodboardId };
      }),

    list: protectedProcedure
      .input(z.object({ brandId: z.string() }))
      .query(async ({ input, ctx }) => {
        const brand = await getBrand(input.brandId);
        if (!brand || brand.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        return moodboardsDb.getBrandMoodboards(input.brandId);
      }),

    get: protectedProcedure
      .input(z.object({ moodboardId: z.number() }))
      .query(async ({ input }) => {
        return moodboardsDb.getMoodboard(input.moodboardId);
      }),

    addImage: protectedProcedure
      .input(
        z.object({
          moodboardId: z.number(),
          imageUrl: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const imageId = await moodboardsDb.addMoodboardImage(input.moodboardId, {
          imageUrl: input.imageUrl,
          description: input.description,
        });

        // Analyze image in background
        moodboardAnalysis
          .analyzeMoodboardImage(input.imageUrl)
          .then((analysis) => {
            moodboardsDb.updateMoodboardImage(imageId, {
              colorPalette: JSON.stringify(analysis.colorPalette),
              composition: JSON.stringify(analysis.composition),
              style: analysis.style.mood.join(","),
            });
          })
          .catch((err) => console.error("Failed to analyze moodboard image:", err));

        return { id: imageId };
      }),

    getImages: protectedProcedure
      .input(z.object({ moodboardId: z.number() }))
      .query(async ({ input }) => {
        return moodboardsDb.getMoodboardImages(input.moodboardId);
      }),

    getAnalysis: protectedProcedure
      .input(z.object({ moodboardId: z.number() }))
      .query(async ({ input }) => {
        const images = await moodboardsDb.getMoodboardImages(input.moodboardId);
        const analyses = images
          .filter((img) => img.colorPalette && img.composition)
          .map((img) => ({
            colorPalette: JSON.parse(img.colorPalette || "{}"),
            composition: JSON.parse(img.composition || "{}"),
            style: {
              mood: img.style?.split(",") || [],
              era: "Unknown",
              genre: "Unknown",
              techniques: [],
              atmosphere: "Unknown",
            },
            visualGuidelines: "",
            summary: img.description || "",
          }));

        return moodboardAnalysis.aggregateMoodboardAnalysis(analyses);
      }),

    delete: protectedProcedure
      .input(z.object({ moodboardId: z.number() }))
      .mutation(async ({ input }) => {
        await moodboardsDb.deleteMoodboard(input.moodboardId);
        return { success: true };
      }),

    autoSynthesize: protectedProcedure
      .input(
        z.object({
          brandId: z.string(),
          moodboardId: z.number(),
          concept: z.string(),
          characterIds: z.array(z.number()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const brand = await getBrand(input.brandId);
        if (!brand || brand.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        let prompt = `Mood board concept: ${input.concept}.`;

        // Add brand context
        prompt += `\nBrand Aesthetic: ${brand.aesthetic || "Cinematic"}.`;
        prompt += `\nBrand Mission: ${brand.mission || ""}.`;

        // Add character context if enabled
        if (input.characterIds && input.characterIds.length > 0) {
          const characters = await characterLibraryDb.getBrandCharacterLibrary(input.brandId);
          const selectedChars = characters.filter((c: { id: number }) => input.characterIds?.includes(c.id));

          if (selectedChars.length > 0) {
            prompt += `\nFeaturing characters:`;
            selectedChars.forEach((c: { id: number }) => {
              prompt += `\n- ${c.name}: ${c.description}. ${c.traits || ""}`;
            });
          }
        }

        prompt += `\nHigh quality, 8k, photorealistic, highly detailed, film grain, cinematic lighting.`;

        // Generate Image
        const { generateStoryboardImage } = await import("../services/aiGeneration");
        // Using Flux Pro for best quality moodboard synthesis
        const imageUrl = await generateStoryboardImage(prompt, "black-forest-labs/flux-1.1-pro");

        // Save to DB
        const imageId = await moodboardsDb.addMoodboardImage(input.moodboardId, {
          imageUrl,
          description: `Auto-synthesized: ${input.concept}`,
        });

        // Trigger Analysis
        moodboardAnalysis
          .analyzeMoodboardImage(imageUrl)
          .then((analysis) => {
            moodboardsDb.updateMoodboardImage(imageId, {
              colorPalette: JSON.stringify(analysis.colorPalette),
              composition: JSON.stringify(analysis.composition),
              style: analysis.style.mood.join(","),
            });
          })
          .catch((err) => console.error("Failed to analyze autofill image:", err));

        return { success: true, imageId, imageUrl };
      }),
  }),

  // Voice Profile Routes
  voiceProfile: router({
    create: protectedProcedure
      .input(
        z.object({
          brandId: z.string(),
          name: z.string(),
          elevenLabsVoiceId: z.string(),
          description: z.string().optional(),
          language: z.string().default("en"),
          tone: z.string().optional(),
          speed: z.number().default(100),
          pitch: z.number().default(100),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const brand = await getBrand(input.brandId);
        if (!brand || brand.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        const profileId = await voiceProfilesDb.createVoiceProfile(input.brandId, {
          name: input.name,
          elevenLabsVoiceId: input.elevenLabsVoiceId,
          description: input.description,
          language: input.language,
          tone: input.tone,
          speed: input.speed,
          pitch: input.pitch,
          isDefault: false,
        });

        return { id: profileId };
      }),

    list: protectedProcedure
      .input(z.object({ brandId: z.string() }))
      .query(async ({ input, ctx }) => {
        const brand = await getBrand(input.brandId);
        if (!brand || brand.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        return voiceProfilesDb.getBrandVoiceProfiles(input.brandId);
      }),

    getDefault: protectedProcedure
      .input(z.object({ brandId: z.string() }))
      .query(async ({ input }) => {
        return voiceProfilesDb.getDefaultVoiceProfile(input.brandId);
      }),

    setDefault: protectedProcedure
      .input(z.object({ profileId: z.number() }))
      .mutation(async ({ input }) => {
        await voiceProfilesDb.setDefaultVoiceProfile(input.profileId);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ profileId: z.number() }))
      .mutation(async ({ input }) => {
        await voiceProfilesDb.deleteVoiceProfile(input.profileId);
        return { success: true };
      }),

    validate: publicProcedure
      .input(
        z.object({
          elevenLabsVoiceId: z.string().optional(),
          name: z.string().optional(),
          tone: z.string().optional(),
          speed: z.number().optional(),
          pitch: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        return elevenLabs.validateVoiceProfile({
          id: 0,
          brandId: 0,
          name: input.name || "",
          elevenLabsVoiceId: input.elevenLabsVoiceId || null,
          description: "",
          language: "en",
          tone: input.tone || null,
          speed: input.speed ?? 100,
          pitch: input.pitch ?? 100,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
      }),

    getAvailableVoices: publicProcedure.query(async () => {
      return elevenLabs.getAvailableVoices();
    }),
  }),

  // Voiceover Routes
  voiceover: router({
    generate: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          script: z.string(),
          voiceProfileId: z.number(),
          language: z.string().default("en"),
        })
      )
      .mutation(async ({ input }) => {
        const voiceProfile = await voiceProfilesDb.getVoiceProfile(input.voiceProfileId);
        if (!voiceProfile) {
          throw new Error("Voice profile not found");
        }

        const result = await elevenLabs.generateBrandVoiceover(
          input.script,
          voiceProfile,
          input.language
        );

        // Save to database
        const voiceoverId = await voiceProfilesDb.createGeneratedVoiceover({
          projectId: input.projectId,
          voiceProfileId: input.voiceProfileId,
          script: input.script,
          audioUrl: result.audioUrl,
          duration: result.duration,
          language: input.language,
          elevenLabsJobId: result.elevenLabsJobId,
        });

        return {
          id: voiceoverId,
          audioUrl: result.audioUrl,
          duration: result.duration,
        };
      }),

    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return voiceProfilesDb.getProjectVoiceovers(input.projectId);
      }),

    delete: protectedProcedure
      .input(z.object({ voiceoverId: z.number() }))
      .mutation(async ({ input }) => {
        await voiceProfilesDb.deleteVoiceover(input.voiceoverId);
        return { success: true };
      }),
  }),

  // Actor / LoRA Routes
  actor: router({
    train: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string(),
        triggerWord: z.string(),
        zipUrl: z.string()
      }))
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user.id.toString();
        return trainCharacterModel(userId, input.projectId, input.name, input.triggerWord, input.zipUrl);
      }),

    status: protectedProcedure
      .input(z.object({ actorId: z.number() }))
      .query(async ({ input }) => {
        const status = await checkActorStatus(input.actorId);
        return { status: status || 'unknown' };
      })
  }),
});
