import { z } from "zod";
import { router, publicProcedure } from "../../_core/trpc";
import { generateSynopsisFromBrief, generateScriptFromSynopsis, generateScriptFromBrief, refineScriptWithNotes } from "../../services/aiGeneration";
import { getDb, getProjectContent } from "../../db";
import { projectContent } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { injectBrandDirectives } from "../services/brandService";
import { logUsage } from "../services/ledgerService";
import { estimateCost } from "../services/pricingService";

export const scriptRouter = router({
    generateSynopsis: publicProcedure
        .input(z.object({ projectId: z.number(), brief: z.string() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

            const content = await getProjectContent(input.projectId);
            const globalNotes = content?.globalDirectorNotes ?? undefined;

            // Brand Guardian: Proactive Injection
            const brandInjectedBrief = await injectBrandDirectives(input.projectId, input.brief);

            const synopsis = await generateSynopsisFromBrief(brandInjectedBrief, globalNotes);

            // Save brief and synopsis to project content
            await db.update(projectContent)
                .set({ brief: input.brief, synopsis: synopsis })
                .where(eq(projectContent.projectId, input.projectId));

            // Log usage
            const cost = estimateCost('gemini-1.5-pro', 1);
            await logUsage(input.projectId, ctx.user.id.toString(), 'gemini-1.5-pro', cost, 'SYNOPSIS_GENERATION');

            return { synopsis };
        }),

    generateScript: publicProcedure
        .input(z.object({ projectId: z.number(), synopsis: z.string().optional(), brief: z.string().optional() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

            const content = await getProjectContent(input.projectId);
            const globalNotes = content?.globalDirectorNotes ?? undefined;

            let script: string;
            if (input.synopsis) {
                const injectedSynopsis = await injectBrandDirectives(input.projectId, input.synopsis);
                script = await generateScriptFromSynopsis(injectedSynopsis, globalNotes);
            } else if (input.brief) {
                const injectedBrief = await injectBrandDirectives(input.projectId, input.brief);
                script = await generateScriptFromBrief(injectedBrief, globalNotes);
            } else if (content?.brief) {
                const injectedBrief = await injectBrandDirectives(input.projectId, content.brief);
                script = await generateScriptFromBrief(injectedBrief, globalNotes);
            } else {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Missing synopsis or brief for script generation" });
            }

            // Save script to project content
            await db.update(projectContent)
                .set({ script: script })
                .where(eq(projectContent.projectId, input.projectId));

            // Log usage
            const cost = estimateCost('gemini-1.5-pro', 1);
            await logUsage(input.projectId, ctx.user.id.toString(), 'gemini-1.5-pro', cost, 'SCRIPT_GENERATION');

            return { script };
        }),

    refineScript: publicProcedure
        .input(z.object({ projectId: z.number(), script: z.string(), notes: z.string() }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

            const content = await getProjectContent(input.projectId);
            const globalNotes = content?.globalDirectorNotes ?? undefined;

            const refinedScript = await refineScriptWithNotes(input.script, input.notes, globalNotes);

            // Save refined script
            await db.update(projectContent)
                .set({ script: refinedScript })
                .where(eq(projectContent.projectId, input.projectId));

            // Log usage
            const cost = estimateCost('gemini-1.5-pro', 1);
            await logUsage(input.projectId, ctx.user.id.toString(), 'gemini-1.5-pro', cost, 'SCRIPT_REFINEMENT');

            return { script: refinedScript };
        }),
});
