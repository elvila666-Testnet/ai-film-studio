import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getProjectContent, getDb } from "../db";
import * as pdDb from "../db/productionDesign";
import { performProductionDesignBreakdown } from "../services/productionDesignService";
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
            const result = await performProductionDesignBreakdown(input.projectId, { userId: ctx.user.id.toString() }, input.refinementNotes);

            const cost = estimateCost("gemini-1.5-flash", 1);
            await logUsage(input.projectId, ctx.user.id.toString(), "gemini-1.5-flash", cost, "PD_BREAKDOWN");

            return result;
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
                            Your goal is to transform a set description into a hyper-realistic, high-fidelity cinematic image generation prompt.
                            
                            ### PHOTOREALISM & CINEMATOGRAPHY COMMANDS ###
                            - ENFORCE hyper-realistic textures: aged wood, cold brushed steel, porous concrete, soft fabric weaves.
                            - LENS: Specify professional optics (e.g., 'Shot on Arri Alexa 35, 35mm Master Prime, f/2.8').
                            - LIGHTING: Use high-end production terms (e.g., 'Volumetric lighting', 'Soft Rembrandt lighting', 'Natural dawn light through hazy windows', 'Cyan/Amber color contrast').
                            - FILM STOCK: Mimic premium stock (e.g., 'Kodak Vision3 500T, fine grain, subtle halation').
                            - NO CGI LOOK: Avoid generic 3D render terms. Focus on physical realism, dust motes, surface imperfections, and realistic depth of field.
                            
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

            // Pass set reference image if available for visual anchoring via Vertex AI
            const imageUrl = await generateSetNano(prompt, input.projectId, ctx.user.id.toString(), set.referenceImageUrl || undefined);
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
                             Your goal is to transform a prop description into a hyper-realistic macro-detail cinematic image generation prompt.
                            
                            ### MACRO REALISM COMMANDS ###
                            - FOCUS: Extremely shallow depth of field, macro photography, sharp focus on specific tactile textures (fingerprints on glass, metallic grain, fabric fibers).
                            - LIGHTING: High-contrast product lighting, rim light to define edges, subtle lens flares or caustic reflections.
                            - MATERIAL RIGOR: Ensure materials described (e.g., carbon fiber, hand-stitched leather) look physically authentic and weathered.
                            
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
