import { invokeLLM } from "../_core/llm";
import type { BrandGuidelines } from "./brandBrain";
import { generateImageWithNanobanana } from "./nanobananaGeneration";

/**
 * Character Archetype Interface
 */
export interface CharacterArchetype {
    id: string;
    name: string;
    description: string;
    personality: string;
    targetAudience: string;
    archetypeType: string;
    visualDescription: string;
    brandAlignment: number;
    reasoning: string;
    imageUrl?: string;
}

/**
 * Generate brand-aligned character archetypes
 */
export async function generateBrandArchetypes(
    brand: BrandGuidelines,
    count: number = 3
): Promise<CharacterArchetype[]> {
    try {
        const prompt = buildArchetypePrompt(brand, count);

        const response = await invokeLLM({
            messages: [
                {
                    role: "system",
                    content: `You are a Brand Character Archetype Generator. Create compelling character archetypes that perfectly embody brand values and resonate with the target audience.

Return a JSON object with an array of archetypes. Each archetype should have:
{
  "archetypes": [
    {
      "id": string (unique identifier like "arch-1"),
      "name": string (character name/title),
      "description": string (detailed character description),
      "personality": string (personality traits),
      "targetAudience": string (who this character appeals to),
      "archetypeType": string (archetype category: Leader, Creator, Hero, Rebel, etc.),
      "visualDescription": string (physical appearance and style),
      "brandAlignment": number (0-100 score),
      "reasoning": string (why this archetype aligns with the brand)
    }
  ]
}`,
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "brand_archetypes",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            archetypes: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        name: { type: "string" },
                                        description: { type: "string" },
                                        personality: { type: "string" },
                                        targetAudience: { type: "string" },
                                        archetypeType: { type: "string" },
                                        visualDescription: { type: "string" },
                                        brandAlignment: { type: "number" },
                                        reasoning: { type: "string" },
                                    },
                                    required: [
                                        "id",
                                        "name",
                                        "description",
                                        "personality",
                                        "targetAudience",
                                        "archetypeType",
                                        "visualDescription",
                                        "brandAlignment",
                                        "reasoning",
                                    ],
                                },
                            },
                        },
                        required: ["archetypes"],
                    },
                },
            },
        });

        const messageContent = response.choices[0]?.message?.content;
        if (!messageContent) {
            throw new Error("No response from LLM");
        }

        const content_text = typeof messageContent === "string" ? messageContent : "";
        const parsed = JSON.parse(content_text);
        const archetypes = parsed.archetypes || [];

        // Generate images for each archetype using NanoBanana
        console.log(`Generating images for ${archetypes.length} archetypes using NanoBanana...`);

        await Promise.all(archetypes.map(async (archetype: CharacterArchetype) => {
            try {
                const imagePrompt = `Cinematic portrait of ${archetype.name}, ${archetype.visualDescription}. ${brand.aesthetic || "Professional, high quality"} style, 8k resolution, detailed texture and lighting, photorealistic`;
                const imageUrl = await generateImageWithNanobanana(imagePrompt, "2k");
                archetype.imageUrl = imageUrl;
            } catch (err) {
                console.warn(`Failed to generate NanoBanana image for archetype ${archetype.name}:`, err);
                // Fallback to placeholder if generation fails, or leave empty
                archetype.imageUrl = "";
            }
        }));

        return archetypes;
    } catch (error) {
        console.error("Brand archetype generation failed:", error);
        throw new Error("Failed to generate brand archetypes");
    }
}

/**
 * Build archetype generation prompt
 */
function buildArchetypePrompt(brand: BrandGuidelines, count: number): string {
    const guidelines = [
        `Brand Name: ${brand.name}`,
        brand.targetCustomer && `Target Customer: ${brand.targetCustomer}`,
        brand.aesthetic && `Aesthetic: ${brand.aesthetic}`,
        brand.mission && `Mission: ${brand.mission}`,
        brand.coreMessaging && `Core Messaging: ${brand.coreMessaging}`,
    ]
        .filter(Boolean)
        .join("\n");

    return `Generate ${count} compelling character archetypes that perfectly embody the brand "${brand.name}".

BRAND GUIDELINES:
${guidelines}

REQUIREMENTS:
1. Each archetype should be a distinct personality that resonates with the target customer
2. Characters should visually represent the brand aesthetic
3. Personalities should embody the brand mission and values
4. Each archetype should appeal to different segments of the target audience
5. Visual descriptions should be detailed and cinematic
6. Brand alignment scores should reflect how well each archetype represents the brand

Create diverse archetypes that could serve as protagonists, supporting characters, or brand ambassadors in film productions. Make them memorable, relatable, and perfectly aligned with the brand identity.`;
}
