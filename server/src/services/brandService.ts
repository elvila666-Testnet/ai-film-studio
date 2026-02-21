import { z } from "zod";
import { getDb } from "../../db";
import { brands, brandAssets, projects, usageLedger } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "../../_core/llm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";

/**
 * 🏢 BRAND INTELLIGENCE SERVICE
 * 
 * Transition from brand data as metadata to a first-class citizen.
 * manages brand identity and proactively injects it into the generation pipeline.
 */

// --- ZOD SCHEMAS ---

export const BrandIdentitySchema = z.object({
    colorPalette: z.record(z.any()).describe("Map of color roles to hex codes"),
    brandVoice: z.string().describe("Description of the tone and communication style"),
    targetAudience: z.string().describe("Detailed description of the target audience"),
    negativeConstraints: z.string().describe("Elements and themes the brand must avoid"),
});

export const BrandCreateSchema = z.object({
    name: z.string().min(1),
    logoUrl: z.string().optional(),
    description: z.string().optional(),
    mission: z.string().optional(),
    coreMessaging: z.string().optional(),
    aesthetic: z.string().optional(),
});

export type BrandIdentity = z.infer<typeof BrandIdentitySchema>;
export type BrandCreateInput = z.infer<typeof BrandCreateSchema>;

// --- CORE FUNCTIONS ---

/**
 * Standard CRUD: Create Brand
 */
export async function createBrand(userId: number, input: BrandCreateInput) {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

    const brandId = randomUUID();
    await db.insert(brands).values({
        id: brandId,
        userId,
        name: input.name,
        logoUrl: input.logoUrl,
        description: input.description,
        mission: input.mission,
        coreMessaging: input.coreMessaging,
        aesthetic: input.aesthetic,
    });

    return brandId;
}

/**
 * Fetch optimized "Brand DNA" for efficient prompt injection.
 * Compressed format to minimize token usage while maintaining identity.
 */
export async function getBrandContext(brandId: string): Promise<string> {
    const db = await getDb();
    if (!db) return "";

    const result = await db.select().from(brands).where(eq(brands.id, brandId)).limit(1);
    const brand = result[0];

    if (!brand) return "";

    const dnaParts = [
        `BRAND: ${brand.name}`,
        brand.brandVoice ? `VOICE: ${brand.brandVoice}` : null,
        brand.colorPalette ? `PALETTE: ${JSON.stringify(brand.colorPalette)}` : null,
        brand.negativeConstraints ? `AVOID: ${brand.negativeConstraints}` : null,
        brand.aesthetic ? `AESTHETIC: ${brand.aesthetic}` : null,
    ].filter(Boolean);

    return dnaParts.join(" | ");
}

/**
 * Ingest Brand Identity from URL or PDF.
 * Leverages Gemini to automatically extract brand "DNA".
 */
export async function ingestBrandIdentity(brandId: string, sourceUrl: string) {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

    console.log(`[BrandService] Analyzing brand source: ${sourceUrl}`);

    const response = await invokeLLM({
        messages: [
            {
                role: "system",
                content: `You are a Senior Brand Strategist. Your task is to extract a structured brand identity from documentation.
        
        Focus on:
        - Primary/Secondary Color Palette (Hex codes)
        - Tone of Voice (Detailed communication style)
        - Target Audience (Demographics and Psychographics)
        - Negative Constraints (Brand taboos, strict off-brand elements)
        
        Return a JSON object only.`
            },
            {
                role: "user",
                content: `Extract Brand Identity from this source: ${sourceUrl}`
            }
        ],
        response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("Failed to extract brand identity");

    const identity = BrandIdentitySchema.parse(typeof content === "string" ? JSON.parse(content) : content);

    await db.update(brands)
        .set({
            colorPalette: identity.colorPalette,
            brandVoice: identity.brandVoice,
            targetAudience: identity.targetAudience,
            negativeConstraints: identity.negativeConstraints,
        })
        .where(eq(brands.id, brandId));

    // 3. Log usage for FinOps
    const brand = await db.select().from(brands).where(eq(brands.id, brandId)).limit(1);
    if (brand[0]) {
        await db.insert(usageLedger).values({
            projectId: 0, // System-level or dummy project ID if no project linked yet
            userId: brand[0].userId.toString(),
            actionType: "BRAND_INGESTION",
            modelId: "gemini-1.5-pro",
            quantity: 1,
            cost: "0.05",
        });
    }

    return identity;
}

/**
 * Proactive Brand Guardian: Interceptor function to inject brand directives.
 * Guaranteed consistency prior to incurring token or generation costs.
 */
export async function injectBrandDirectives(projectId: number, originalPrompt: string): Promise<string> {
    const db = await getDb();
    if (!db) return originalPrompt;

    const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const brandId = project[0]?.brandId;

    if (!brandId) return originalPrompt;

    const dna = await getBrandContext(brandId);
    if (!dna) return originalPrompt;

    // Append brand directives to guide the sub-agent
    return `### BRAND_IDENTITY ###\n${dna}\n\n### ORIGINAL_PROMPT ###\n${originalPrompt}\n\nMaintain brand consistency above all.`;
}

/**
 * Asset Management
 */
export async function addBrandAsset(brandId: string, type: "PDF" | "URL" | "IMG", gcsPath: string, description?: string) {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

    await db.insert(brandAssets).values({
        brandId,
        assetType: type,
        gcsPath,
        description,
    });
}
