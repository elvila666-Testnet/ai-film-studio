/**
 * Storyboard-Character tRPC Router
 * Procedures for character binding, consistency checking, and management
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  bindCharacterToFrame,
  getFrameCharacterBinding,
  getFramesWithCharacter,
  updateFrameConsistencyScore,
  lockFrameCharacterConsistency,
  unlockFrameCharacterConsistency,
  getProjectFramesWithCharacters,
  getInconsistentFrames,
  getCharacterAppearanceSummary,
  clearFrameCharacterBinding,
  getProjectConsistencyReport,
} from "../db/storyboardCharacter";
import {
  analyzeCharacterConsistency,
  compareCharacterAppearances,
  generateAppearanceRecommendations,
  CharacterAppearance,
} from "../services/characterConsistency";
import { getBrand } from "../db";

export const storyboardCharacterRouter = router({
  // Bind character to frame
  bindCharacter: protectedProcedure
    .input(
      z.object({
        frameId: z.number(),
        characterLibraryId: z.number(),
        characterAppearance: z.string().optional(), // JSON string
        consistencyScore: z.number().optional(),
        consistencyNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await bindCharacterToFrame(input.frameId, input.characterLibraryId, {
        characterAppearance: input.characterAppearance,
        consistencyScore: input.consistencyScore,
        consistencyNotes: input.consistencyNotes,
      });
      return { success: true };
    }),

  // Get character binding for a frame
  getFrameCharacter: protectedProcedure
    .input(z.object({ frameId: z.number() }))
    .query(async ({ input }) => {
      return getFrameCharacterBinding(input.frameId);
    }),

  // Get all frames with a specific character
  getFramesWithCharacter: protectedProcedure
    .input(z.object({ projectId: z.number(), characterLibraryId: z.number() }))
    .query(async ({ input }) => {
      return getFramesWithCharacter(input.projectId, input.characterLibraryId);
    }),

  // Update consistency score
  updateConsistencyScore: protectedProcedure
    .input(
      z.object({
        frameId: z.number(),
        score: z.number().min(0).max(100),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateFrameConsistencyScore(input.frameId, input.score, input.notes);
      return { success: true };
    }),

  // Lock character consistency
  lockConsistency: protectedProcedure
    .input(z.object({ frameId: z.number() }))
    .mutation(async ({ input }) => {
      await lockFrameCharacterConsistency(input.frameId);
      return { success: true };
    }),

  // Unlock character consistency
  unlockConsistency: protectedProcedure
    .input(z.object({ frameId: z.number() }))
    .mutation(async ({ input }) => {
      await unlockFrameCharacterConsistency(input.frameId);
      return { success: true };
    }),

  // Get all frames with characters in project
  getProjectFrames: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return getProjectFramesWithCharacters(input.projectId);
    }),

  // Get inconsistent frames
  getInconsistentFrames: protectedProcedure
    .input(z.object({ projectId: z.number(), threshold: z.number().default(70) }))
    .query(async ({ input }) => {
      return getInconsistentFrames(input.projectId, input.threshold);
    }),

  // Get character appearance summary
  getAppearanceSummary: protectedProcedure
    .input(z.object({ projectId: z.number(), characterLibraryId: z.number() }))
    .query(async ({ input }) => {
      return getCharacterAppearanceSummary(input.projectId, input.characterLibraryId);
    }),

  // Clear character binding
  clearCharacter: protectedProcedure
    .input(z.object({ frameId: z.number() }))
    .mutation(async ({ input }) => {
      await clearFrameCharacterBinding(input.frameId);
      return { success: true };
    }),

  // Get consistency report
  getConsistencyReport: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return getProjectConsistencyReport(input.projectId);
    }),

  // Analyze character consistency across frames
  analyzeConsistency: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        characterLibraryId: z.number(),
        characterName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const frames = await getFramesWithCharacter(input.projectId, input.characterLibraryId);
      return analyzeCharacterConsistency(frames, input.characterName);
    }),

  // Compare two appearances
  compareAppearances: protectedProcedure
    .input(
      z.object({
        appearance1: z.object({
          clothing: z.string(),
          expression: z.string(),
          pose: z.string(),
          accessories: z.string().optional(),
        }),
        appearance2: z.object({
          clothing: z.string(),
          expression: z.string(),
          pose: z.string(),
          accessories: z.string().optional(),
        }),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return compareCharacterAppearances(
        input.appearance1 as CharacterAppearance,
        input.appearance2 as CharacterAppearance,
        input.context
      );
    }),

  // Generate appearance recommendations
  generateAppearanceRecommendations: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        characterName: z.string(),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const brand = await getBrand(input.brandId);
      if (!brand) throw new Error("Brand not found");

      return generateAppearanceRecommendations(
        input.characterName,
        {
          aesthetic: brand.aesthetic || "",
          mission: brand.mission || "",
          coreMessaging: brand.coreMessaging || "",
        },
        input.context
      );
    }),
});

export type StoryboardCharacterRouter = typeof storyboardCharacterRouter;
