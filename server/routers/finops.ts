import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { usageLedger } from "../../drizzle/schema";
import { eq, sum } from "drizzle-orm";
import { getOrCreateTokenBalance, deductTokens } from "../db/billing";
import { TOKEN_COSTS, type TokenActionType } from "../services/stripe";

export const finopsRouter = router({
  getProjectUsage: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unreachable");

      const result = await db
        .select({ totalCost: sum(usageLedger.cost) })
        .from(usageLedger)
        .where(eq(usageLedger.projectId, input.projectId));

      return { totalCost: parseFloat(result[0].totalCost || "0") };
    }),

  /**
   * Pre-flight token cost estimation.
   * Returns whether the user has enough tokens for the action.
   */
  estimateTokenCost: protectedProcedure
    .input(z.object({ actionType: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const cost = TOKEN_COSTS[input.actionType as TokenActionType];

      if (cost === undefined) {
        return { tokenCost: 0, currentBalance: 0, sufficient: false, unknown: true };
      }

      const balance = await getOrCreateTokenBalance(userId);

      return {
        tokenCost: cost,
        currentBalance: balance.balance,
        sufficient: balance.balance >= cost,
        unknown: false,
      };
    }),

  /**
   * Deduct tokens after an AI generation completes.
   * Should be called by AI service routers after successful generation.
   */
  consumeTokens: protectedProcedure
    .input(
      z.object({
        actionType: z.string(),
        description: z.string(),
        projectId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const cost = TOKEN_COSTS[input.actionType as TokenActionType];

      if (cost === undefined) {
        throw new Error(`Unknown action type: ${input.actionType}`);
      }

      const newBalance = await deductTokens(
        userId,
        cost,
        input.description,
        input.projectId
      );

      return { newBalance, tokensConsumed: cost };
    }),

  /**
   * Get current token balance.
   */
  getTokenBalance: protectedProcedure.query(async ({ ctx }) => {
    const balance = await getOrCreateTokenBalance(ctx.user.id);
    return {
      balance: balance.balance,
      totalPurchased: balance.totalPurchased,
      totalConsumed: balance.totalConsumed,
    };
  }),

  /**
   * Calculate real cost of a production including infrastructure.
   */
  calculateProductionCost: protectedProcedure
    .input(
      z.object({
        targetDurationSeconds: z.number().min(1).default(60),
        complexity: z.enum(["low", "medium", "high"]).default("medium"),
        qualityTier: z.enum(["fast", "quality", "enterprise"]).default("quality"),
        expectedHoursOfCompute: z.number().min(1).default(12),
      })
    )
    .query(async ({ input }) => {
      const { targetDurationSeconds, complexity, qualityTier, expectedHoursOfCompute } = input;

      // Assumptions
      const avgShotLength = 3; 
      const baseShots = Math.ceil(targetDurationSeconds / avgShotLength);

      // Multipliers based on complexity
      const iterationFactor = {
        low: 2,
        medium: 5,
        high: 10,
      }[complexity];

      const totalGenerationAttempts = baseShots * iterationFactor;

      // Cost Rates
      const imageRates = { fast: 0.01, quality: 0.055, enterprise: 0.15 };
      const videoRatesPerSec = { fast: 0.05, quality: 0.10, enterprise: 0.20 };
      const voiceRatesPerSec = 0.01; // ElevenLabs

      const imageCost = imageRates[qualityTier] * totalGenerationAttempts;
      const videoCost = videoRatesPerSec[qualityTier] * targetDurationSeconds * (iterationFactor / 2);
      const voiceCost = voiceRatesPerSec * targetDurationSeconds;
      
      // Script & LLM tasks cost (approx based on duration)
      const tokenCostPerMin = 0.05;
      const scriptCost = (targetDurationSeconds / 60) * tokenCostPerMin * iterationFactor;

      const aiApisTotal = imageCost + videoCost + voiceCost + scriptCost;

      // Infrastructure Rates
      const cloudRunHourly = 0.05; // active load vCPU
      const cloudSQLHourly = 0.25; // managed DB overhead mapping
      const baseStorageEgress = Math.ceil(targetDurationSeconds / 60) * 0.10; // $0.10 per min of generated 4k video

      const infraTotal = (cloudRunHourly * expectedHoursOfCompute) + 
                         (cloudSQLHourly * expectedHoursOfCompute) + 
                         baseStorageEgress;

      return {
        aiCosts: {
          scripting: scriptCost,
          storyboarding: imageCost,
          videoGeneration: videoCost,
          voiceover: voiceCost,
          total: aiApisTotal
        },
        infraCosts: {
          cloudRun: cloudRunHourly * expectedHoursOfCompute,
          cloudSQL: cloudSQLHourly * expectedHoursOfCompute,
          storageAndEgress: baseStorageEgress,
          total: infraTotal
        },
        totalEstimatedCost: aiApisTotal + infraTotal,
      };
    }),
});
