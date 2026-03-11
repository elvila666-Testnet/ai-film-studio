/**
 * tRPC Routers for Casting System
 * Handles character libraries, moodboards, and voiceovers
 */

import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
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
        const updateData: any = {
          name: input.name,
          description: input.description,
          imageUrl: input.imageUrl,
          traits: input.traits,
        };

        // If imageUrl is base64, upload to GCS
        if (input.imageUrl && input.imageUrl.startsWith('data:image/')) {
          console.log(`[CastingRouter] Securing library character image...`);
          const { uploadBase64Image } = await import("../_core/gcs");
          updateData.imageUrl = await uploadBase64Image(input.imageUrl, `library/characters`);
          console.log(`[CastingRouter] Library image secured: ${updateData.imageUrl}`);
        }

        await characterLibraryDb.updateCharacterInLibrary(input.characterId, updateData);

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
          brandGuidelines as { id: string; name: string; targetCustomer: string; aesthetic: string; mission: string; coreMessaging: string },
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

    // Discover Talent — extract principal characters from the script
    generateOptions: publicProcedure
      .input(
        z.object({
          projectId: z.number(),
          brandId: z.string().optional(),
          targetDemographic: z.string().optional(),
          count: z.number().default(4),
          refinementNotes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { getProjectContent, createCharacter } = await import("../db");

        console.log(`[Casting] ▶ Discover Talent started. projectId=${input.projectId}`);


        const content = await getProjectContent(input.projectId);
        const scriptText = content?.script || "";

        // Extract technical casting requirements if available
        let castingContext = "";
        try {
          const rawTech = (content as any)?.technicalShots;
          if (rawTech) {
            const parsedTech = JSON.parse(rawTech);
            if (parsedTech.castingRequirements) {
              castingContext = `\n\nDIRECTOR'S CASTING REQUIREMENTS:\n${parsedTech.castingRequirements}`;
            }
          }
        } catch (e) { }

        console.log(`[Casting] Script length: ${scriptText.length} chars. Tech casting requirements length: ${castingContext.length}`);

        if (!scriptText || scriptText.length < 50) {
          console.error(`[Casting] ✘ Script too short or missing. Length: ${scriptText.length}`);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `No script found (or script too short: ${scriptText.length} chars). Write a script first in the Script tab.`,
          });
        }

        // Use LLM to extract principal characters from the script
        const { invokeLLM } = await import("../_core/llm");
        const { injectBrandDirectives } = await import("../services/brandService");

        console.log(`[Casting] Calling LLM for principal character extraction...`);

        let systemPrompt = `You are a professional Casting Director. Extract principal characters from a screenplay.
        
MANDATORY PERSONNEL BREAKDOWN:
1. PRINCIPAL LEADS:
   - Extract the main characters explicitly named in the script.
   - Define constraints, emotional baselines, and precise physicality for photorealistic AI generation.
2. SPECIALIZED ACTION MODELS:
   - Identify explicit roles requiring specialized stunt performers entirely based on script action.
   - HAND & FOOT MODELS: For extreme close-ups of script-specific gear manipulation.
3. BACKGROUND EXTRAS:
   - Identify background archetypes and their energy levels to support the scene's dynamic.

Return ONLY a JSON array of character objects, no other text.
${input.refinementNotes ? `\n### REFINEMENT INSTRUCTIONS ###\nThe Director has provided the following feedback on your previous casting selection. You MUST strictly incorporate these changes:\n${input.refinementNotes}\n` : ""}`;

        systemPrompt = await injectBrandDirectives(input.projectId, systemPrompt);

        const llmResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `Extract principal characters from this screenplay. Return ONLY a JSON array.

SCRIPT:
${scriptText.substring(0, 4000)}${castingContext}

Response format (ONLY JSON, no other text):
[{"name":"Character Name","description":"Detailed profile (Age, build, weathered skin, intensity, specific brand gear, athletic mastery)"}]

Rules: 
- Include ALL valid on-screen characters (Leads, Stunt Doubles, and key Extras).
- Provide rich visual descriptions.`,
            },
          ],
          responseFormat: { type: "json_object" },
        });

        // Extract text content from LLM response
        const rawContent = llmResponse.choices?.[0]?.message?.content;
        let responseText = "";
        if (typeof rawContent === "string") {
          responseText = rawContent.trim();
        } else if (Array.isArray(rawContent)) {
          // Content might be an array of TextContent objects
          responseText = rawContent
            .map((part) => (typeof part === "string" ? part : (part as { text?: string }).text || ""))
            .join("")
            .trim();
        } else {
          responseText = String(rawContent || "").trim();
        }

        console.log(`[Casting] LLM response length: ${responseText.length} chars`);
        console.log(`[Casting] LLM response preview: ${responseText.substring(0, 200)}`);

        let charactersToGenerate: Array<{ name: string; description: string }> = [];

        try {
          // Robust JSON extraction: strip markdown fences, find JSON array
          let cleaned = responseText
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "")
            .trim();

          // Try to find the JSON array in the response
          const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
          if (arrayMatch) {
            cleaned = arrayMatch[0];
          }

          const parsed = JSON.parse(cleaned);

          // Handle both array and object-with-array responses
          if (Array.isArray(parsed)) {
            charactersToGenerate = parsed;
          } else if (parsed.characters && Array.isArray(parsed.characters)) {
            charactersToGenerate = parsed.characters;
          } else if (typeof parsed === "object") {
            // Single character object
            charactersToGenerate = [parsed];
          }
        } catch (parseError) {
          console.error(`[Casting] ✘ JSON parse failed. Raw: ${responseText.substring(0, 500)}`);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to parse characters from AI response. Please try again.",
          });
        }

        // Filter out invalid entries
        charactersToGenerate = charactersToGenerate.filter(
          (c) => c && typeof c.name === "string" && c.name.length > 0
        );

        if (charactersToGenerate.length === 0) {
          console.error(`[Casting] ✘ No valid characters after parsing.`);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No principal characters found in the script. Ensure the script has named characters with dialogue.",
          });
        }

        console.log(`[Casting] ✓ Discovered ${charactersToGenerate.length} principal characters: ${charactersToGenerate.map(c => c.name).join(", ")}`);

        const newCharacters = [];

        // No limit, extract all returned valid characters
        const characterPromises = charactersToGenerate.map(async (char) => {
          try {
            const newChar = await createCharacter(
              input.projectId,
              {
                name: char.name,
                description: char.description || "Principal character",
                imageUrl: "draft",
                isHero: false
              }
            );
            console.log(`[Casting] ✓ Saved: ${char.name}`);
            return newChar;
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[Casting] ✘ Failed to save ${char.name}: ${message}`);
            return null;
          }
        });

        const results = await Promise.all(characterPromises);
        newCharacters.push(...results.filter(Boolean));

        console.log(`[Casting] ▶ Discovery complete. ${newCharacters.length} characters saved.`);
        return newCharacters;
      }),

    generateCharacterOptionImage: protectedProcedure
      .input(
        z.object({
          characterId: z.number(),
          notes: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { renderCharacterPortrait } = await import("../services/agents/production/castingDirectorAgent");
        const { getCharacter } = await import("../db");

        const char = await getCharacter(input.characterId);
        if (!char) throw new Error("Character not found");

        console.log(`[Casting] Routing PCI render request for ${char.name} to CastingDirectorAgent...`);

        try {
          const result = await renderCharacterPortrait(
            char.projectId,
            char.id,
            ctx.user.id.toString(),
            input.notes
          );

          return {
            success: true,
            imageUrl: result.imageUrl,
            description: input.notes ? `${char.description} | Directorial adjustments: ${input.notes}` : char.description
          };
        } catch (err: any) {
          console.error(`[Casting] PCI render failed for character ID ${input.characterId}:`, err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `PCI Synthesis Error: ${err.message}`,
            cause: err
          });
        }
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
          const selectedChars = characters.filter((c: any) => input.characterIds?.includes(c.id));

          if (selectedChars.length > 0) {
            prompt += `\nFeaturing characters:`;
            selectedChars.forEach((c: any) => {
              prompt += `\n- ${c.name}: ${c.description}. ${c.traits || ""}`;
            });
          }
        }

        prompt += `\nHigh quality, 8k, photorealistic, highly detailed, film grain, cinematic lighting.`;

        // Generate Image
        const { generateStoryboardImage } = await import("../services/aiGeneration");
        // Using Flux Pro for best quality moodboard synthesis
        const imageUrl = await generateStoryboardImage(prompt, "imagen-4.0-generate-001");

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
