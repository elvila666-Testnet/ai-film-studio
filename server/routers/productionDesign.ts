import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getProjectContent, getDb } from "../db";
import * as pdDb from "../db/productionDesign";
import { runProductionDesignAgent } from "../services/agents/production/productionDesignAgent";
import { generateSetNano, generatePropNano } from "../services/aiGeneration";
import { logUsage } from "../services/ledgerService";
import { estimateCost } from "../services/pricingService";
import { eq } from "drizzle-orm";
import { productionDesignSets, productionDesignProps } from "../../drizzle/schema";

export const productionDesignRouter = router({
    /**
     * Breakdown the technical script into specific sets and props.
     */
    breakdownSets: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            refinementNotes: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

            // 1. Clear existing sets and props for this project (Casting-style refresh)
            console.log(`[PD_Router] Clearing existing PD data for project ${input.projectId}`);
            await db.delete(productionDesignProps).where(eq(productionDesignProps.projectId, input.projectId));
            await db.delete(productionDesignSets).where(eq(productionDesignSets.projectId, input.projectId));

            const content = await getProjectContent(input.projectId);
            if (!content?.technicalShots) {
                 throw new TRPCError({ code: "BAD_REQUEST", message: "Director breakdown required first." });
            }

            const technicalScript = JSON.parse(content.technicalShots);
            console.log(`[PD_Router] Running Production Design Agent...`);
            const pdOutput = await runProductionDesignAgent(
                technicalScript,
                input.projectId,
                content?.globalDirectorNotes ?? undefined,
                input.refinementNotes
            );

            // 2. Save new sets and props to DB
            const savedSets = [];
            for (const set of pdOutput.sets) {
                const setId = await pdDb.createPDSet(input.projectId, set);
                
                const savedProps = [];
                for (const prop of set.props) {
                    const propId = await pdDb.createPDProp(input.projectId, setId, prop);
                    savedProps.push({ ...prop, id: propId });
                }
                savedSets.push({ ...set, id: setId, props: savedProps });
            }

            const cost = estimateCost("gemini-1.5-flash", 1);
            await logUsage(input.projectId, ctx.user.id.toString(), "gemini-1.5-flash", cost, "PD_BREAKDOWN");

            return { sets: savedSets, generalStyle: pdOutput.generalStyle };
        }),

    /**
     * List all sets for a project, including their props.
     */
    listSets: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

            const sets = await pdDb.getProjectPDSets(input.projectId);
            const result = [];

            for (const set of sets) {
                const props = await pdDb.getSetPDProps(set.id);
                result.push({ ...set, props });
            }

            return result;
        }),

    /**
     * Render a visual portrait of a set.
     */
    renderSet: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            setId: z.number(),
            notes: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const set = await pdDb.getPDSet(input.setId);
            if (!set) throw new TRPCError({ code: "NOT_FOUND", message: "Set not found" });

            let prompt = set.description || "";
            const content = await getProjectContent(input.projectId);
            
            // Use LLM refinement with global vision context
            let contentResult: any;
            try {
                const { invokeLLM } = await import("../_core/llm");
                const refinement = await invokeLLM({
                    messages: [
                        {
                            role: "system",
                            content: `You are a PRODUCTION_DESIGN_REFINEMENT_AGENT. 
                            Your goal is to transform a set description into a high-fidelity cinematic image generation prompt.
                            
                            ### GLOBAL VISUAL VISION ###
                            ${content?.masterVisual || "High-fidelity cinematic look."}
                            
                            ### COLOR PALETTE & TEXTURAL LAW ###
                            STRICTLY ENFORCE the color palette and textural logic defined in the Global Visual Vision or Notes. 
                            This palette is the absolute visual law for all assets.
                            
                            ### TASK ###
                            Merge the original description with the global visual style, atmosphere, and palette Law.
                            Return ONLY a descriptive narrative paragraph for the image generator. 
                            Do not use lists. Focus on cinematic lighting, surface textures, and specified color accents.
                            
                            Original: ${set.description}
                            Notes: ${input.notes || "None"}`
                        },
                        {
                            role: "user",
                            content: `Refine the set design based on the original description and notes, ensuring it adheres strictly to the Global Visual Vision and Textural Laws. Output only the final prompt paragraph.`
                        }
                    ]
                });
                contentResult = refinement.choices[0]?.message.content;
            } catch (err) {
                console.error("[PD_Router] LLM refinement for set failed:", err);
                contentResult = set.description;
            }
            prompt = (typeof contentResult === "string" ? contentResult : JSON.stringify(contentResult)) || `${set.description} | ${input.notes || ""}`;
            console.log(`[PD_Router] RenderSet Prompt:`, prompt.substring(0, 100));

            const imageUrl = await generateSetNano(prompt, input.projectId, ctx.user.id.toString());
            console.log(`[PD_Router] RenderSet URL:`, imageUrl);
            
            await pdDb.updatePDSet(input.setId, { imageUrl });

            return { imageUrl };
        }),

    /**
     * Render or update a prop image.
     */
    renderProp: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            propId: z.number(),
            notes: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

            const propResult = await db.select().from(productionDesignProps).where(eq(productionDesignProps.id, input.propId)).limit(1);
            const prop = propResult[0];
            if (!prop) throw new TRPCError({ code: "NOT_FOUND", message: "Prop not found" });

            let propContentResult: any;
            try {
                const { invokeLLM } = await import("../_core/llm");
                const refinement = await invokeLLM({
                    messages: [
                        {
                            role: "system",
                            content: `You are a HERO_PROP_REFINEMENT_AGENT. 
                            Your goal is to transform a prop description into a macro-detail cinematic image generation prompt.
                            
                            ### COLOR PALETTE & MATERIAL LOGIC ###
                            STRICTLY ENFORCE the color palette and material logic defined in the Notes or original description.
                            Highlight specific tech finishes and textures that match the mandated visual style.
                            
                            ### TASK ###
                            Return ONLY a descriptive narrative paragraph for a macro product shot.
                            
                            Description: ${prop.description || prop.name}
                            Notes: ${input.notes || "None"}`
                        }
                    ]
                });
                propContentResult = refinement.choices[0]?.message.content;
            } catch (err) {
                console.error("[PD_Router] LLM refinement for prop failed:", err);
                propContentResult = prop.description || prop.name;
            }
            const prompt = (typeof propContentResult === "string" ? propContentResult : JSON.stringify(propContentResult)) || `${prop.description || prop.name} | ${input.notes || ""}`;

            const imageUrl = await generatePropNano(prompt, input.projectId, ctx.user.id.toString());
            await pdDb.updatePDProp(input.propId, { imageUrl });

            return { imageUrl };
        }),

    updateShotReference: protectedProcedure
        .input(z.object({
            shotId: z.number(),
            imageUrl: z.string(),
        }))
        .mutation(async ({ input }) => {
            // If imageUrl is base64, upload to GCS
            let finalUrl = input.imageUrl;
            if (input.imageUrl.startsWith('data:image/')) {
                const { uploadBase64Image } = await import("../_core/gcs");
                finalUrl = await uploadBase64Image(input.imageUrl, "shots/references");
            }

            await pdDb.updateShotReferenceImage(input.shotId, finalUrl);
            return { success: true, imageUrl: finalUrl };
        }),

    /**
     * Update a set's reference image (user upload or AI render).
     */
    updateSetReference: protectedProcedure
        .input(z.object({
            setId: z.number(),
            imageUrl: z.string(),
        }))
        .mutation(async ({ input }) => {
            // If imageUrl is base64, upload to GCS
            let finalUrl = input.imageUrl;
            if (input.imageUrl.startsWith('data:image/')) {
                const { uploadBase64Image } = await import("../_core/gcs");
                finalUrl = await uploadBase64Image(input.imageUrl, "sets/references");
            }

            await pdDb.updateSetReferenceImage(input.setId, finalUrl);
            return { success: true, imageUrl: finalUrl };
        }),

    /**
     * Update a prop's reference image (user upload or AI render).
     */
    updatePropReference: protectedProcedure
        .input(z.object({
            propId: z.number(),
            imageUrl: z.string(),
        }))
        .mutation(async ({ input }) => {
            // If imageUrl is base64, upload to GCS
            let finalUrl = input.imageUrl;
            if (input.imageUrl.startsWith('data:image/')) {
                const { uploadBase64Image } = await import("../_core/gcs");
                finalUrl = await uploadBase64Image(input.imageUrl, "props/references");
            }

            await pdDb.updatePDProp(input.propId, { referenceImageUrl: finalUrl });
            return { success: true, imageUrl: finalUrl };
        }),

    /**
     * Add a manual prop to a set.
     */
    addProp: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            setId: z.number(),
            name: z.string(),
            description: z.string(),
        }))
        .mutation(async ({ input }) => {
            const propId = await pdDb.createPDProp(input.projectId, input.setId, {
                name: input.name,
                description: input.description,
            });
            return { propId };
        }),

    /**
     * Delete a set.
     */
    deleteSet: protectedProcedure
        .input(z.object({ setId: z.number() }))
        .mutation(async ({ input }) => {
            await pdDb.deletePDSet(input.setId);
            return { success: true };
        }),
});
