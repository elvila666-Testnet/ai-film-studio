import { z } from "zod";
import { getDb } from "../db";
import { brands, brandAssets, projects, usageLedger } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";

/**
 * 🏢 BRAND INTELLIGENCE SERVICE
 * 
 * Transition from brand data as metadata to a first-class citizen.
 * manages brand identity and proactively injects it into the generation pipeline.
 */

// --- ZOD SCHEMAS ---

const stringCoercion = z.any().transform(val => {
    if (typeof val === 'string') return val;
    if (val === undefined || val === null) return "";
    return JSON.stringify(val);
}).optional().default("");

const colorPaletteCoercion = z.any().transform(val => {
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        } catch {
            return { extracted: val };
        }
    }
    if (typeof val === 'object' && val !== null) return val;
    return {};
}).optional().default({});

export const BrandIdentitySchema = z.object({
    description: stringCoercion.describe("Brief summary of the brand's mission and overall vibe"),
    visualIdentity: stringCoercion.describe("Description of the visual style, aesthetic, photography composition, and lighting"),
    colorPalette: colorPaletteCoercion.describe("Map of color roles to hex codes"),
    brandVoice: stringCoercion.describe("Description of the tone and communication style"),
    targetAudience: stringCoercion.describe("Detailed description of the target audience"),
    negativeConstraints: stringCoercion.describe("Elements and themes the brand must avoid"),
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

import { parseAgentJSON } from "./agents/_agentUtils";

const BRAND_DNA_FALLBACK: BrandIdentity = {
    description: "Multi-purpose brand with cinematic appeal.",
    visualIdentity: "Clean, professional, natural lighting.",
    colorPalette: { primary: "#000000", secondary: "#ffffff" },
    brandVoice: "Authoritative yet accessible.",
    targetAudience: "Global professionals.",
    negativeConstraints: "Avoid low-fidelity or generic visuals.",
};

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
 * Fetch raw Brand Identity for logic that needs granular fields.
 */
export async function getBrandDNA(brandId: string): Promise<string> {
    const db = await getDb();
    if (!db) return "";

    const result = await db.select().from(brands).where(eq(brands.id, brandId)).limit(1);
    const brand = result[0];

    if (!brand) return "";

    return JSON.stringify({
        description: brand.description,
        visualIdentity: brand.visualIdentity,
        colorPalette: brand.colorPalette,
        brandVoice: brand.brandVoice,
        negativeConstraints: brand.negativeConstraints,
        aesthetic: brand.aesthetic
    });
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
        - Description (Brief summary of the brand)
        - Visual Identity (Lighting, aesthetic, composition)
        
        Return a strict JSON object with these keys: description, visualIdentity, colorPalette, brandVoice, targetAudience, negativeConstraints`
            },
            {
                role: "user",
                content: `Using your extensive internal knowledge base, extract the Brand Identity for the brand associated with this name or source: ${sourceUrl}`
            }
        ],
        response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message.content;
    const parsed = parseAgentJSON<any>(content, "BrandService.ingestBrandIdentity", BRAND_DNA_FALLBACK);

    // Map common snake_case or slightly different LLM outputs to our camelCase schema
    const mapped: BrandIdentity = {
        description: parsed.description || "",
        visualIdentity: parsed.visualIdentity || parsed.visual_identity || "",
        colorPalette: parsed.colorPalette || parsed.color_palette || {},
        brandVoice: parsed.brandVoice || parsed.tone_of_voice || parsed.brand_voice || "",
        targetAudience: parsed.targetAudience || parsed.target_audience || "",
        negativeConstraints: parsed.negativeConstraints || parsed.negative_constraints || ""
    };

    const identity = BrandIdentitySchema.parse(mapped);

    await db.update(brands)
        .set({
            description: identity.description,
            visualIdentity: identity.visualIdentity,
            colorPalette: identity.colorPalette,
            brandVoice: identity.brandVoice,
            targetAudience: identity.targetAudience,
            negativeConstraints: identity.negativeConstraints,
        })
        .where(eq(brands.id, brandId));

    return identity;
}

/**
 * Discover Brand Identity from Name.
 * Uses AI to identify the brand's web presence and then extracts the DNA.
 */
export async function discoverBrand(brandId: string, name: string) {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

    console.log(`[BrandService] Discovering brand info for: ${name}`);

    // 1. Ask LLM for the likely website
    const searchResponse = await invokeLLM({
        messages: [
            {
                role: "system",
                content: `You are a Brand Researcher. Given a brand name, identify its official website URL.
                If it's a well-known brand, provide the official corporate or retail site.
                Return only the URL in the response.`
            },
            {
                role: "user",
                content: `Find the official website for this brand: ${name}`
            }
        ]
    });

    const url = searchResponse.choices[0]?.message.content;
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
        // Fallback: If no URL found, try to generate identity from internal knowledge
        return await ingestBrandFromKnowledge(brandId, name);
    }

    const cleanUrl = url.trim().match(/https?:\/\/[^\s]+/)?.[0] || url.trim();

    // 2. Ingest from the discovered URL
    return await ingestBrandIdentity(brandId, cleanUrl);
}

/**
 * Fallback: Generate Brand Identity from LLM's internal knowledge if no website found.
 */
async function ingestBrandFromKnowledge(brandId: string, name: string) {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

    const response = await invokeLLM({
        messages: [
            {
                role: "system",
                content: `You are a Senior Brand Strategist. Based on your extensive internal knowledge of the brand "${name}", provide its structural DNA.
                Return a strict JSON object with these keys: description, visualIdentity, colorPalette, brandVoice, targetAudience, negativeConstraints`
            },
            {
                role: "user",
                content: `Extract DNA for the brand: ${name}`
            }
        ],
        response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message.content;
    const parsed = parseAgentJSON<any>(content, "BrandService.ingestBrandFromKnowledge", BRAND_DNA_FALLBACK);

    const mapped: BrandIdentity = {
        description: parsed.description || "",
        visualIdentity: parsed.visualIdentity || parsed.visual_identity || "",
        colorPalette: parsed.colorPalette || parsed.color_palette || {},
        brandVoice: parsed.brandVoice || parsed.tone_of_voice || parsed.brand_voice || "",
        targetAudience: parsed.targetAudience || parsed.target_audience || "",
        negativeConstraints: parsed.negativeConstraints || parsed.negative_constraints || ""
    };

    const identity = BrandIdentitySchema.parse(mapped);

    await db.update(brands)
        .set({
            description: identity.description,
            visualIdentity: identity.visualIdentity,
            colorPalette: identity.colorPalette,
            brandVoice: identity.brandVoice,
            targetAudience: identity.targetAudience,
            negativeConstraints: identity.negativeConstraints,
        })
        .where(eq(brands.id, brandId));

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
