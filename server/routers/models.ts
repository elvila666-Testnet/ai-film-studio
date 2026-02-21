/**
 * Model Registry Router
 * Handles listing available AI models and managing user favorites
 */
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { modelConfigs, userModelFavorites } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const modelRouter = router({
    // List all active models with favorite status for current user
    list: protectedProcedure
        .query(async ({ ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            // Get all active models
            const models = await db
                .select()
                .from(modelConfigs)
                .where(eq(modelConfigs.isActive, true));

            // Get user favorites
            const favorites = await db
                .select()
                .from(userModelFavorites)
                .where(eq(userModelFavorites.userId, ctx.user.id));

            const favoriteIds = new Set(favorites.map((f: { modelConfigId: number }) => f.modelConfigId));

            // Merge data
            return models.map((model: { id: number }) => ({
                ...model,
                isFavorite: favoriteIds.has(model.id),
                // Ensure numeric types are handled correctly if driver returns strings
                costPerUnit: parseFloat(model.costPerUnit || "0"),
            }));
        }),

    // Toggle favorite status
    toggleFavorite: protectedProcedure
        .input(z.object({ modelConfigId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const existing = await db
                .select()
                .from(userModelFavorites)
                .where(and(
                    eq(userModelFavorites.userId, ctx.user.id),
                    eq(userModelFavorites.modelConfigId, input.modelConfigId)
                ))
                .limit(1);

            if (existing.length > 0) {
                // Remove favorite
                await db
                    .delete(userModelFavorites)
                    .where(eq(userModelFavorites.id, existing[0].id));
                return { isFavorite: false };
            } else {
                // Add favorite
                await db
                    .insert(userModelFavorites)
                    .values({
                        userId: ctx.user.id,
                        modelConfigId: input.modelConfigId
                    });
                return { isFavorite: true };
            }
        }),

    // Seed default models (Admin only - simplified for now)
    seedDefaults: protectedProcedure
        .mutation(async ({ ctx }) => {
            if (ctx.user.role !== 'admin') throw new Error("Unauthorized");

            const db = await getDb();
            if (!db) throw new Error("Database not available");

            // Check if we have models, if not seed them
            const count = await db.select().from(modelConfigs).limit(1);
            if (count.length === 0) {
                await db.insert(modelConfigs).values([
                    {
                        category: "image",
                        provider: "replicate",
                        modelId: "black-forest-labs/flux-schnell",
                        name: "Flux Schnell",
                        description: "Fastest generation, good for prototyping.",
                        costPerUnit: "0.0030",
                        isActive: true,
                        isBuiltIn: true
                    },
                    {
                        category: "image",
                        provider: "replicate",
                        modelId: "black-forest-labs/flux-1.1-pro",
                        name: "Flux 1.1 Pro",
                        description: "High quality professional model.",
                        costPerUnit: "0.0550",
                        isActive: true,
                        isBuiltIn: true
                    },
                    {
                        category: "image",
                        provider: "replicate",
                        modelId: "black-forest-labs/flux-1.1-pro-ultra",
                        name: "Flux Ultra (Raw)",
                        description: "Highest fidelity, raw mode enabled.",
                        costPerUnit: "0.0600",
                        isActive: true,
                        isBuiltIn: true
                    }
                ]);
                return { success: true, message: "Seeded default models" };
            }
            return { success: true, message: "Models already exist" };
        })
});
