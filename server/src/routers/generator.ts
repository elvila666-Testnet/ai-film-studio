import { z } from "zod";
import { router, publicProcedure } from "../../_core/trpc";
import { generateAsset } from "../services/replicateService";
import { estimateCost, validateCost } from "../services/pricingService";
import { getDb } from "../../db";
import { generations } from "../../../drizzle/schema";

export const generatorRouter = router({
    createAsset: publicProcedure
        .input(z.object({
            projectId: z.number(),
            shotId: z.number().optional(), // Linked to shot?
            modelId: z.string(),
            prompt: z.string(),
            force: z.boolean().default(false), // User approved high cost?
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new Error("Unauthorized");

            // 1. Estimate Cost
            const cost = estimateCost(input.modelId, 1); // 1 Image

            // 2. Validate (Throws if > threshold and !force)
            validateCost(cost, input.force);

            // 3. Generate (Replicate -> GCS)
            const { imageUrl, cost: actualCost } = await generateAsset(
                input.modelId,
                { prompt: input.prompt },
                input.projectId,
                ctx.user.id.toString()
            );

            // 4. Save Asset Record (Ledger is handled by service now)
            const db = await getDb();
            if (!db) throw new Error("Database unreachable");

            await db.insert(generations).values({
                projectId: input.projectId,
                shotId: input.shotId || null,
                imageUrl,
                prompt: input.prompt,
                model: input.modelId,
                qualityTier: "fast",
                cost: actualCost.toString(),
            });

            return { success: true, imageUrl, cost: actualCost };
        }),
});
