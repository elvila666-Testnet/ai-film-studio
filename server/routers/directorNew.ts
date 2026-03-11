import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getProjectContent, getProject, getDb } from "../db";
import { projectContent } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getBrandContext } from "../services/brandService";
import { logUsage } from "../services/ledgerService";
import { estimateCost } from "../services/pricingService";
import {
    breakdownScript,
    validateDepartmentReturn,
    checkDepartmentDeviations,
    approveTechnicalScript,
    getDepartmentRequirements,
} from "../services/agents/pre-production/directorAgent";
import {
    breakdownCast,
    saveCastToProject,
    renderCharacterPortrait,
} from "../services/agents/production/castingDirectorAgent";

export const directorRouter = router({

    // ─── Technical Script Breakdown ──────────────────────────────────
    breakdownScript: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            globalNotes: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const content = await getProjectContent(input.projectId);
            if (!content?.script) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No script found. Generate and approve a script first." });
            }

            const project = await getProject(input.projectId);
            const brandDNA = project?.brandId ? await getBrandContext(project.brandId) : undefined;

            const technicalScript = await breakdownScript(
                input.projectId,
                content.script,
                brandDNA,
                input.globalNotes
            );

            const cost = estimateCost("gemini-1.5-flash", technicalScript.scenes?.length ?? 1);
            await logUsage(input.projectId, ctx.user.id.toString(), "gemini-1.5-flash", cost, "TECHNICAL_BREAKDOWN");

            // ─── Fire background AI tasks (non-blocking) ────────────────────────
            const userId = ctx.user.id.toString();
            const castingReqs = technicalScript.castingRequirements || JSON.stringify(technicalScript);
            const script = content.script!;
            const brandDNAStr = brandDNA ? JSON.stringify(brandDNA) : undefined;

            const db = await getDb();

            // Run casting + cinema pipeline in parallel, in the background
            Promise.allSettled([
                // 1. Auto-run casting breakdown + mark castingValidated
                (async () => {
                    try {
                        console.log("[BackgroundTask] Starting auto-casting breakdown...");
                        const normalizedCastingReqs = typeof castingReqs === "string" ? castingReqs : JSON.stringify(castingReqs);
                        let castingOutput = await breakdownCast(normalizedCastingReqs, input.projectId, content.brief ?? undefined);
                        
                        // Check for deviations
                        const deviationCheck = await checkDepartmentDeviations("Casting", normalizedCastingReqs, JSON.stringify(castingOutput), content.brief ?? undefined);
                        
                        if (deviationCheck.hasDeviations) {
                            console.log("[BackgroundTask] Casting deviations found. Invoking Director intervention...");
                            const validation = await validateDepartmentReturn(
                                input.projectId,
                                "Casting",
                                normalizedCastingReqs,
                                JSON.stringify(castingOutput),
                                undefined,
                                content.brief ?? undefined
                            );
                            
                            if (validation.revisedOutput) {
                                castingOutput = JSON.parse(validation.revisedOutput);
                            }
                        } else {
                            console.log("[BackgroundTask] Casting aligned with brief. Auto-passing.");
                        }

                        await saveCastToProject(input.projectId, userId, castingOutput, false);
                        
                        // Mark casting as validated in DB
                        if (db) {
                            await db.update(projectContent)
                                .set({ castingValidated: true })
                                .where(eq(projectContent.projectId, input.projectId));
                        }
                        console.log(`[BackgroundTask] Auto-casting complete: ${castingOutput.characters.length} characters. castingValidated=true.`);
                    } catch (err: any) {
                        console.error("[BackgroundTask] Auto-casting FAILED:", err.message);
                    }
                })(),

                // 2. Auto-run cinema pipeline (Cine + PD) + mark both validated
                (async () => {
                    try {
                        console.log("[BackgroundTask] Starting auto-cinema pipeline...");
                        const { runCinemaExecutionPipeline } = await import("../services/cinemaOrchestrator");
                        let result = await runCinemaExecutionPipeline({
                            sceneScript: script,
                            projectId: input.projectId,
                            globalNotes: brandDNAStr,
                            scaleMode: "Standard Cinematic"
                        });

                        // Check for deviations in Cinematography
                        const cineReqs = technicalScript.cinematographyRequirements || "Standard cinematic coverage";
                        const cineDeviation = await checkDepartmentDeviations("Cinematography", cineReqs, JSON.stringify(result.cinematography || {}), content.brief ?? undefined);
                        
                        if (cineDeviation.hasDeviations) {
                             console.log("[BackgroundTask] Cinematography deviations found. Invoking Director intervention...");
                             const cineValidation = await validateDepartmentReturn(
                                input.projectId,
                                "Cinematography",
                                cineReqs,
                                JSON.stringify(result.cinematography || {}),
                                undefined,
                                content.brief ?? undefined
                            );
                            if (cineValidation.revisedOutput) {
                                result.cinematography = JSON.parse(cineValidation.revisedOutput);
                            }
                        }

                        // Check for deviations in Production Design
                        const pdReqs = technicalScript.productionDesignRequirements || "Standard set dressing";
                        const pdDeviation = await checkDepartmentDeviations("ProductionDesign", pdReqs, JSON.stringify(result.productionDesign || {}), content.brief ?? undefined);

                        if (pdDeviation.hasDeviations) {
                            console.log("[BackgroundTask] Production Design deviations found. Invoking Director intervention...");
                            const pdValidation = await validateDepartmentReturn(
                                input.projectId,
                                "ProductionDesign",
                                pdReqs,
                                JSON.stringify(result.productionDesign || {}),
                                undefined,
                                content.brief ?? undefined
                            );
                            if (pdValidation.revisedOutput) {
                                result.productionDesign = JSON.parse(pdValidation.revisedOutput);
                            }
                        }

                        // CinematographyTab reads from masterVisual (expects {cinematography, finalHarmonizedDocument})
                        // ProductionDesignTab reads from globalDirectorNotes as plain text (atmospherePhilosophy or generalStyle)
                        const pdText = (result.productionDesign as any)?.atmospherePhilosophy
                            || (result.productionDesign as any)?.generalStyle
                            || "";
                            
                        if (db) {
                            await db.update(projectContent)
                                .set({
                                    masterVisual: JSON.stringify(result, null, 2),
                                    globalDirectorNotes: pdText,
                                    cineValidated: true,
                                    pdValidated: true,
                                })
                                .where(eq(projectContent.projectId, input.projectId));
                        }
                        console.log("[BackgroundTask] Auto-cinema pipeline complete. Conditional validations checked. masterVisual saved. cineValidated=pdValidated=true.");
                    } catch (err: any) {
                        console.error("[BackgroundTask] Auto-cinema pipeline FAILED:", err.message);
                    }
                })(),
            ]).catch(console.error);

            return { success: true, technicalScript, status: "pending_review" };
        }),

    approveTechnicalScript: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .mutation(async ({ input }) => {
            await approveTechnicalScript(input.projectId);
            return {
                success: true,
                message: "✅ Technical script approved. Casting Director, Cinematography, and Production Design can now begin."
            };
        }),

    getDepartmentRequirements: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            department: z.enum(["casting", "cinematography", "productionDesign"]),
        }))
        .query(async ({ input }) => {
            const requirements = await getDepartmentRequirements(input.projectId, input.department);
            return { requirements };
        }),

    // ─── Department Validation Loops (Stateless) ─────────────────────
    validateCasting: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            castingOutput: z.string(),
            characterUrls: z.array(z.string()).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const requirements = await getDepartmentRequirements(input.projectId, "casting");
            const content = await getProjectContent(input.projectId);
            const result = await validateDepartmentReturn(
                input.projectId,
                "Casting",
                requirements,
                input.castingOutput,
                { characterUrls: input.characterUrls },
                content?.globalDirectorNotes ?? undefined
            );
            const cost = estimateCost("gemini-1.5-flash", 1);
            await logUsage(input.projectId, ctx.user.id.toString(), "gemini-1.5-flash", cost, "DIRECTOR_VALIDATE_CASTING");
            return result;
        }),

    validateCinematography: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            cinematographyOutput: z.string(),
            specs: z.string().optional(),
            referenceUrls: z.array(z.string()).optional(),
            moodboardUrls: z.array(z.string()).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const requirements = await getDepartmentRequirements(input.projectId, "cinematography");
            const content = await getProjectContent(input.projectId);
            const result = await validateDepartmentReturn(
                input.projectId,
                "Cinematography",
                requirements,
                input.cinematographyOutput,
                {
                    specs: input.specs || input.cinematographyOutput,
                    referenceUrls: input.referenceUrls,
                    moodboardUrls: input.moodboardUrls
                },
                content?.globalDirectorNotes ?? undefined
            );
            const cost = estimateCost("gemini-1.5-flash", 1);
            await logUsage(input.projectId, ctx.user.id.toString(), "gemini-1.5-flash", cost, "DIRECTOR_VALIDATE_CINEMATOGRAPHY");
            return result;
        }),

    validateProductionDesign: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            pdOutput: z.string(),
            specs: z.string().optional(),
            referenceUrls: z.array(z.string()).optional(),
            moodboardUrls: z.array(z.string()).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const requirements = await getDepartmentRequirements(input.projectId, "productionDesign");
            const content = await getProjectContent(input.projectId);
            const result = await validateDepartmentReturn(
                input.projectId,
                "ProductionDesign",
                requirements,
                input.pdOutput,
                {
                    specs: input.specs || input.pdOutput,
                    referenceUrls: input.referenceUrls,
                    moodboardUrls: input.moodboardUrls
                },
                content?.globalDirectorNotes ?? undefined
            );
            const cost = estimateCost("gemini-1.5-flash", 1);
            await logUsage(input.projectId, ctx.user.id.toString(), "gemini-1.5-flash", cost, "DIRECTOR_VALIDATE_PD");
            return result;
        }),

    getDeptValidationStatus: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            const content = await getProjectContent(input.projectId);
            return {
                castingValidated: content?.castingValidated ?? false,
                cineValidated: content?.cineValidated ?? false,
                pdValidated: content?.pdValidated ?? false,
            };
        }),

    // ─── Casting Director Integration ────────────────────────────────
    castingBreakdown: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            renderImages: z.boolean().default(false),
            refinementNotes: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const requirements = await getDepartmentRequirements(input.projectId, "casting");
            const content = await getProjectContent(input.projectId);

            const castingOutput = await breakdownCast(
                requirements,
                input.projectId,
                content?.brief ?? undefined,
                input.refinementNotes
            );
            const saved = await saveCastToProject(
                input.projectId,
                ctx.user.id.toString(),
                castingOutput,
                input.renderImages
            );

            const cost = estimateCost("gemini-1.5-flash", 1);
            await logUsage(input.projectId, ctx.user.id.toString(), "gemini-1.5-flash", cost, "CASTING_BREAKDOWN");

            return { characters: castingOutput.characters, saved };
        }),

    renderCharacter: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            characterId: z.number(),
        }))
        .mutation(async ({ input, ctx }) => {
            const result = await renderCharacterPortrait(
                input.projectId,
                input.characterId,
                ctx.user.id.toString()
            );
            return result;
        }),

    getStatus: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            const content = await getProjectContent(input.projectId);
            return {
                scriptStatus: content?.scriptStatus ?? "draft",
                technicalScriptStatus: content?.technicalScriptStatus ?? "draft",
                hasTechnicalScript: !!content?.technicalShots,
            };
        }),
});
