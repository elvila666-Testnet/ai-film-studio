import { invokeLLM } from "../../../_core/llm";
import { getDb } from "../../../db";
import { characters } from "../../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateCharacterNano } from "../../../services/aiGeneration";
import { parseAgentJSON } from "../_agentUtils";
import { injectBrandDirectives } from "../../../services/brandService";

export interface CastCharacter {
    name: string;
    role: "hero" | "supporting" | "background";
    age: string;
    physicalDescription: string;      // Height, build, hair, eyes
    wardrobeDescription: string;       // Specific costume for this shoot
    personalityEssence: string;        // 2-3 adjectives that define them
    imageGenerationPrompt: string;     // Ready-to-use Nanobanana prompt for portrait
}

export interface CastingOutput {
    characters: CastCharacter[];
    totalRoles: number;
    heroCount: number;
    supportingCount: number;
}

const CASTING_FALLBACK: CastingOutput = {
    characters: [],
    totalRoles: 0,
    heroCount: 0,
    supportingCount: 0
};

/**
 * CASTING DIRECTOR AGENT
 * Receives the technical script requirements from the Director.
 * Generates detailed character breakdowns + renders portrait references.
 */
export async function breakdownCast(
    castingRequirements: string,
    projectId?: number,
    directorBrief?: string,
    refinementNotes?: string
): Promise<CastingOutput> {
    let systemPrompt = `You are the CASTING_DIRECTOR_AGENT.
Your job is to break down the casting requirements into a professional, high-fidelity talent manifest optimized for AI Character Consistent Generation.

MANDATORY PERSONNEL BREAKDOWN:
1. PRINCIPAL LEADS:
   - Identify the main protagonists and antagonists from the script.
   - Describe their physicality and emotional baseline in precise terms that an AI image generator can reproduce consistently.
2. SPECIALIZED ACTION MODELS:
   - Identify specific stunt doubles, athletic archetypes, or specialized talents ONLY if required by the action in the scene.
   - HAND & FOOT MODELS: Precise talent for extreme close-ups of specific gear interaction extracted from the script.
3. BACKGROUND EXTRAS:
   - Define the energy level and visual demographic of background extras to contrast or complement the scene's emotional objective.

WARDROBE & GEAR:
- Specify exact gear interactions based on the provided script, Brand DNA, and Director's requirements. Do not invent specific brands unless instructed.
${refinementNotes ? `\n### REFINEMENT INSTRUCTIONS ###\nThe Director has provided the following feedback on your previous casting breakdown. You MUST strictly incorporate these changes while maintaining character consistency:\n${refinementNotes}\n` : ""}

${directorBrief ? `\n### DIRECTOR'S BRIEF ALIGNMENT ###\nYou MUST align your casting output with the Director's specific directives below:\n${directorBrief}\n` : ""}

Each character must have enough visual specificity to be generated with an AI image model.

Return JSON matching exactly:
{
  "characters": [
    {
      "name": string,
      "role": "hero" | "supporting" | "background",
      "age": string,
      "physicalDescription": string,     // MUST BE A SCALAR STRING: Detailed profile (build, intensity, skin texture)
      "wardrobeDescription": string,    // MUST BE A SCALAR STRING: Specific gear and its condition
      "personalityEssence": string,      // MUST BE A SCALAR STRING: Internal drive and emotional constraint
      "imageGenerationPrompt": string    // MUST BE A SCALAR STRING: Detailed portrait prompt (Flux/Nanobanana)
    }
  ],
  "totalRoles": number,
  "heroCount": number,
  "supportingCount": number
}

### CRITICAL RULES:
- NO NESTED OBJECTS in description fields.
- DO NOT use category headers (Principal Leads, etc.) as keys in the JSON root. Return EXACTLY the schema above.
- Ensure all types match exactly.`;

    if (projectId) {
        systemPrompt = await injectBrandDirectives(projectId, systemPrompt);
    }

    const response = await invokeLLM({
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: `Project Casting Task\n\nCasting Requirements from Director:\n${castingRequirements}`
            }
        ],
        response_format: { type: "json_object" }
    });

    const raw = response.choices[0]?.message.content;
    const output = parseAgentJSON<CastingOutput>(raw, "CastingDirectorAgent", CASTING_FALLBACK);

    // Normalization: Ensure all fields are strings (React Error #31 protection)
    if (output.characters) {
        output.characters = output.characters.map(char => ({
            ...char,
            physicalDescription: normalizeToString(char.physicalDescription),
            wardrobeDescription: normalizeToString(char.wardrobeDescription),
            personalityEssence: normalizeToString(char.personalityEssence),
            imageGenerationPrompt: normalizeToString(char.imageGenerationPrompt)
        }));
    }

    return output;
}

/**
 * Normalizes values to string for React safety.
 */
function normalizeToString(val: any): string {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") {
        return Object.entries(val)
            .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
            .join("\n");
    }
    return String(val);
}

/**
 * Save cast breakdown to DB and optionally render character portraits.
 */
export async function saveCastToProject(
    projectId: number,
    userId: string,
    castOutput: CastingOutput,
    renderImages = false
): Promise<Array<{ characterId: number; name: string; imageUrl?: string }>> {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

    const results: Array<{ characterId: number; name: string; imageUrl?: string }> = [];

    for (const char of castOutput.characters) {
        let imageUrl = "draft"; // Placeholder until rendered

        if (renderImages) {
            try {
                console.log(`[CastingDirectorAgent] Rendering PCI sheet for: ${char.name}`);
                imageUrl = await generateCharacterNano(
                    char.imageGenerationPrompt || `${char.physicalDescription} | Wardrobe: ${char.wardrobeDescription}`,
                    [], // No reference by default during bulk extraction
                    projectId,
                    userId
                );
            } catch (err) {
                console.error(`[CastingDirectorAgent] Failed to render ${char.name}:`, err);
            }
        }

        // Insert or find existing character
        const [inserted] = await db.insert(characters).values({
            projectId,
            name: char.name,
            description: `${char.physicalDescription} | Wardrobe: ${char.wardrobeDescription} | Personality: ${char.personalityEssence}`,
            imageUrl,
            isHero: char.role === "hero",
            isLocked: false,
        });

        const insertId = (inserted as unknown as { insertId?: number })?.insertId;
        if (insertId) {
            results.push({ characterId: insertId, name: char.name, imageUrl: renderImages ? imageUrl : undefined });
        }
    }

    console.log(`[CastingDirectorAgent] Saved ${results.length} characters for project ${projectId}`);
    return results;
}

/**
 * Render a single character portrait (called when user selects a character to render).
 */
export async function renderCharacterPortrait(
    projectId: number,
    characterId: number,
    userId: string,
    notes?: string
): Promise<{ imageUrl: string }> {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

    const charResult = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
    const char = charResult[0];
    if (!char) throw new TRPCError({ code: "NOT_FOUND", message: "Character not found" });

    const referenceImages = char.referenceImageUrl ? [char.referenceImageUrl] : [];
    let prompt = char.description || "";

    // BUG-03 FIX: If there are directorial notes, use an LLM to refine the prompt
    // This prevents the "Regenerate from scratch" behavior and keeps the identity anchored.
    if (notes) {
        console.log(`[CastingDirectorAgent] Refining prompt with notes: "${notes}"`);
        try {
            const refinementResponse = await invokeLLM({
                messages: [
                    {
                        role: "system",
                        content: `You are a PROMPT_REFINEMENT_AGENT. 
Your job is to merge an existing character visual description with new directorial notes.
Produce a single, concise, highly detailed portrait prompt for a high-end AI image generator (Flux/Nanobanana).
Maintain the CORE IDENTITY (age, race, face shape) from the original while strictly incorporating the new notes.

Original Description: ${char.description}
New Notes: ${notes}

Return ONLY the refined prompt string.`
                    }
                ]
            });
            prompt = refinementResponse.choices[0]?.message.content || `${char.description} | ${notes}`;
        } catch (e) {
            console.error("[CastingDirectorAgent] Refinement pass failed, falling back to simple concat.");
            prompt = `${char.description} | Directorial notes: ${notes}`;
        }
    }

    const description = prompt.trim() || `Cinematic studio character portrait of ${char.name}, professional headshot, neutrals background, film grain`;

    if (!char.name) throw new TRPCError({ code: "BAD_REQUEST", message: "Character has no name. Please set a name before rendering." });

    console.log(`[CastingDirectorAgent] Rendering PCI sheet for ${char.name}. Reference count: ${referenceImages.length}. Notes present: ${!!notes}`);

    try {
        const imageUrl = await generateCharacterNano(
            description,
            referenceImages,
            projectId,
            userId,
            false,
            characterId // Fixed seed for identity locking
        );

        console.log(`[CastingDirectorAgent] PCI Render Success for ${char.name}: ${imageUrl}`);

        await db.update(characters)
            .set({ imageUrl })
            .where(eq(characters.id, characterId));

        return { imageUrl };
    } catch (err: any) {
        console.error(`[CastingDirectorAgent] CRITICAL FAILURE for ${char.name}:`, err);
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Casting Render Failed: ${err.message}. Check server logs for details.`,
            cause: err
        });
    }
}
