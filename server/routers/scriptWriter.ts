import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getProjectContent, getProject } from "../db";
import { getBrandContext } from "../services/brandService";
import { logUsage } from "../services/ledgerService";
import { estimateCost } from "../services/pricingService";
import {
    generateSynopsis,
    generateScript,
    refineScript,
    approveScript,
} from "../services/agents/pre-production/scriptWriterAgent";

export const scriptWriterRouter = router({

    validateBrief: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            brief: z.string().min(10, "Brief must be at least 10 characters"),
        }))
        .mutation(async ({ input }) => {
            const project = await getProject(input.projectId);
            const brandDNA = project?.brandId ? await getBrandContext(project.brandId) : "No specific brand DNA provided.";

            const { validateBrief } = await import("../services/agents/pre-production/validationAgent");
            const validationResult = await validateBrief(brandDNA, input.brief);

            const { updateProjectContent } = await import("../db");
            await updateProjectContent(input.projectId, { brandValidationFeedback: validationResult.feedback });
            
            return validationResult;
        }),

    generateSynopsis: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            brief: z.string().min(10, "Brief must be at least 10 characters"),
        }))
        .mutation(async ({ input, ctx }) => {
            const project = await getProject(input.projectId);
            const brandDNA = project?.brandId ? await getBrandContext(project.brandId) : undefined;

            const { synopsis } = await generateSynopsis(
                input.projectId, 
                input.brief, 
                brandDNA, 
                project?.type, 
                project?.targetDuration ?? undefined
            );

            const cost = estimateCost("gemini-1.5-flash", 1);
            await logUsage(input.projectId, ctx.user.id.toString(), "gemini-1.5-flash", cost, "SYNOPSIS_GENERATION");

            return { synopsis, status: "pending_review" };
        }),

    generateScript: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            synopsis: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const content = await getProjectContent(input.projectId);
            const project = await getProject(input.projectId);
            const brandDNA = project?.brandId ? await getBrandContext(project.brandId) : undefined;
            const synopsisToUse = input.synopsis ?? content?.synopsis ?? content?.brief;

            if (!synopsisToUse) throw new TRPCError({ 
                code: "BAD_REQUEST", 
                message: "Insufficient narrative foundation: No synopsis or brief available to generate a script. Please add a project brief in the Project Vault or generate a synopsis first." 
            });

            const { script } = await generateScript(
                input.projectId,
                synopsisToUse,
                brandDNA,
                content?.globalDirectorNotes ?? undefined,
                project?.type,
                project?.targetDuration ?? undefined
            );

            const cost = estimateCost("gemini-1.5-flash", 1);
            await logUsage(input.projectId, ctx.user.id.toString(), "gemini-1.5-flash", cost, "SCRIPT_GENERATION");

            return { script, status: "pending_review" };
        }),

    refineScript: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            script: z.string(),
            notes: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            const project = await getProject(input.projectId);
            const brandDNA = project?.brandId ? await getBrandContext(project.brandId) : undefined;

            const { script } = await refineScript(input.projectId, input.script, input.notes, brandDNA);

            const cost = estimateCost("gemini-1.5-flash", 1);
            await logUsage(input.projectId, ctx.user.id.toString(), "gemini-1.5-flash", cost, "SCRIPT_REFINEMENT");

            return { script, status: "pending_review" };
        }),

    approveScript: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .mutation(async ({ input }) => {
            await approveScript(input.projectId);
            return { success: true, message: "✅ Script approved. Director is ready to receive the breakdown." };
        }),

    unlockScript: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .mutation(async ({ input }) => {
            const { updateProjectContent } = await import("../db");
            await updateProjectContent(input.projectId, { scriptStatus: "draft" });
            return { success: true, message: "Script Unlocked. Edit mode enabled." };
        }),

    getStatus: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            const content = await getProjectContent(input.projectId);
            return {
                scriptStatus: content?.scriptStatus ?? "draft",
                hasSynopsis: !!content?.synopsis,
                hasScript: !!content?.script,
            };
        }),
});
