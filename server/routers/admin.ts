import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getModelConfigs, upsertModelConfig, deleteModelConfig, setActiveModel, initializeModels, ensureActiveModels } from "../db";

export const adminRouter = router({
    getModels: adminProcedure.query(async () => {
        return await getModelConfigs();
    }),

    upsertModel: adminProcedure
        .input(z.object({
            id: z.number().optional(),
            category: z.enum(["text", "image", "video"]),
            provider: z.string(),
            modelId: z.string(),
            name: z.string().optional().nullable(),
            description: z.string().optional().nullable(),
            costPerUnit: z.string().optional().nullable(),
            apiKey: z.string().optional().nullable(),
            apiEndpoint: z.string().optional().nullable(),
            isActive: z.boolean().default(false),
            isBuiltIn: z.boolean().default(false),
        }))
        .mutation(async ({ input }) => {
            // Create InsertModelConfig from input
            const config = {
                ...input,
                name: input.name ?? null,
                description: input.description ?? null,
                costPerUnit: input.costPerUnit ?? "0.0000",
                apiKey: input.apiKey ?? null,
                apiEndpoint: input.apiEndpoint ?? null,
            };
            await upsertModelConfig(config);
            return { success: true };
        }),

    deleteModel: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            await deleteModelConfig(input.id);
            return { success: true };
        }),

    setActiveModel: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            await setActiveModel(input.id);
            return { success: true };
        }),

    seedModels: adminProcedure
        .mutation(async () => {
            await initializeModels();
            await ensureActiveModels();
            return { success: true };
        }),
});
