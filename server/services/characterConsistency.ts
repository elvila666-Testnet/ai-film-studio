import { invokeLLM } from "../_core/llm";

/**
 * Extract character descriptions from script
 */
export async function extractCharacterDescriptions(script: string): Promise<Record<string, string>> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a film production assistant. Extract detailed character descriptions from the provided script.
        For each character, provide a comprehensive description including: physical appearance, age, clothing style, distinctive features, personality traits, and any unique characteristics.
        Return as JSON object with character names as keys and descriptions as values.`,
      },
      {
        role: "user",
        content: `Extract character descriptions from this script:\n\n${script}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "character_descriptions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            characters: {
              type: "object",
              additionalProperties: {
                type: "string",
              },
            },
          },
          required: ["characters"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Failed to extract character descriptions");

  try {
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    return parsed.characters || {};
  } catch {
    return {};
  }
}

/**
 * Generate character-consistent prompt for a shot
 */
export function generateConsistentPrompt(
  basePrompt: string,
  characterReference: Record<string, string>,
  shotContext: string
): string {
  const characterDescriptions = Object.entries(characterReference)
    .map(([name, desc]) => `${name}: ${desc}`)
    .join("\n");

  return `${basePrompt}

CHARACTER CONSISTENCY REQUIREMENTS:
${characterDescriptions}

SHOT CONTEXT: ${shotContext}

IMPORTANT: Ensure all characters maintain consistent appearance, clothing, and physical characteristics across this shot.
Use the character descriptions above to maintain visual consistency.`;
}

/**
 * Generate variation prompt for regeneration
 */
export function generateVariationPrompt(
  basePrompt: string,
  characterReference: Record<string, string>,
  variationIndex: number
): string {
  const variations = [
    "slightly different angle",
    "different lighting setup",
    "closer camera position",
    "wider shot perspective",
    "from a different direction",
  ];

  const variation = variations[variationIndex % variations.length];

  const characterDescriptions = Object.entries(characterReference)
    .map(([name, desc]) => `${name}: ${desc}`)
    .join("\n");

  return `${basePrompt}

CHARACTER CONSISTENCY REQUIREMENTS:
${characterDescriptions}

VARIATION: Generate this shot from a ${variation}, while maintaining all character appearances and consistency.
Keep all character details identical to previous shots - only change the camera perspective and composition.`;
}

/**
 * Generate seed for reproducible image generation
 */
export function generateSeed(projectId: number, shotNumber: number, variant: number = 0): number {
  // Create a deterministic seed based on project, shot, and variant
  const combined = `${projectId}-${shotNumber}-${variant}`;
  let hash = 0;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert to positive number in valid range
  return Math.abs(hash) % 2147483647;
}

/**
 * Extract character names from prompt
 */
export function extractCharacterNamesFromPrompt(prompt: string): string[] {
  // Simple regex to find capitalized words that might be character names
  const matches = prompt.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) || [];
  const uniqueMatches = Array.from(new Set(matches));
  return uniqueMatches.slice(0, 5); // Return unique names, max 5
}

/**
 * Validate character consistency between prompts
 */
export function validateCharacterConsistency(
  prompt1: string,
  prompt2: string,
  characterReference: Record<string, string>
): { isConsistent: boolean; issues: string[] } {
  const issues: string[] = [];
  const characters = Object.keys(characterReference);

  // Check if all character names are mentioned in both prompts
  for (const character of characters) {
    const inPrompt1 = prompt1.toLowerCase().includes(character.toLowerCase());
    const inPrompt2 = prompt2.toLowerCase().includes(character.toLowerCase());

    if (inPrompt1 && !inPrompt2) {
      issues.push(`Character "${character}" missing from second prompt`);
    }
  }

  return {
    isConsistent: issues.length === 0,
    issues,
  };
}


// ============================================================================
// ADVANCED CHARACTER CONSISTENCY ANALYSIS
// ============================================================================

import { StoryboardImage } from "../../drizzle/schema";

export interface CharacterAppearance {
  clothing: string;
  expression: string;
  pose: string;
  accessories?: string;
  notes?: string;
}

export interface CharacterConsistencyAnalysis {
  overallScore: number;
  issues: Array<{
    frameId: number;
    shotNumber: number;
    issue: string;
    severity: "low" | "medium" | "high";
    suggestion: string;
  }>;
  recommendations: string[];
  appearanceProfile: {
    clothing: string[];
    expression: string[];
    pose: string[];
    accessories: string[];
  };
}

/**
 * Analyze character consistency across multiple frames
 */
export async function analyzeCharacterConsistency(
  frames: StoryboardImage[],
  characterName: string
): Promise<CharacterConsistencyAnalysis> {
  if (frames.length === 0) {
    return {
      overallScore: 100,
      issues: [],
      recommendations: ["No frames to analyze"],
      appearanceProfile: {
        clothing: [],
        expression: [],
        pose: [],
        accessories: [],
      },
    };
  }

  // Parse character appearances from frames
  const appearances: Array<{ frameId: number; shotNumber: number; appearance: CharacterAppearance }> =
    frames
      .filter((f) => f.characterAppearance)
      .map((f) => ({
        frameId: f.id,
        shotNumber: f.shotNumber,
        appearance: JSON.parse(f.characterAppearance || "{}"),
      }));

  if (appearances.length === 0) {
    return {
      overallScore: 0,
      issues: [],
      recommendations: ["No appearance data found for this character"],
      appearanceProfile: {
        clothing: [],
        expression: [],
        pose: [],
        accessories: [],
      },
    };
  }

  // Build appearance descriptions for LLM analysis
  const appearanceDescriptions = appearances
    .map(
      (a) =>
        `Frame ${a.shotNumber}: Clothing: ${a.appearance.clothing}, Expression: ${a.appearance.expression}, Pose: ${a.appearance.pose}${
          a.appearance.accessories ? `, Accessories: ${a.appearance.accessories}` : ""
        }`
    )
    .join("\n");

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a film production expert analyzing character consistency across storyboard frames. 
          Analyze the character appearances and identify any inconsistencies that would break visual continuity.
          Provide detailed feedback on clothing, expression, pose, and accessories.
          Return a JSON response with consistency analysis.`,
        },
        {
          role: "user",
          content: `Analyze consistency for character "${characterName}" across these frames:\n\n${appearanceDescriptions}\n\nProvide a JSON response with:
          - overallScore (0-100): How consistent the character is across frames
          - issues: Array of {frameId, shotNumber, issue, severity, suggestion}
          - recommendations: Array of improvement suggestions
          - appearanceProfile: {clothing, expression, pose, accessories} - arrays of observed values`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "character_consistency",
          strict: true,
          schema: {
            type: "object",
            properties: {
              overallScore: { type: "number", description: "Consistency score 0-100" },
              issues: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    frameId: { type: "number" },
                    shotNumber: { type: "number" },
                    issue: { type: "string" },
                    severity: { type: "string", enum: ["low", "medium", "high"] },
                    suggestion: { type: "string" },
                  },
                  required: ["frameId", "shotNumber", "issue", "severity", "suggestion"],
                },
              },
              recommendations: {
                type: "array",
                items: { type: "string" },
              },
              appearanceProfile: {
                type: "object",
                properties: {
                  clothing: { type: "array", items: { type: "string" } },
                  expression: { type: "array", items: { type: "string" } },
                  pose: { type: "array", items: { type: "string" } },
                  accessories: { type: "array", items: { type: "string" } },
                },
                required: ["clothing", "expression", "pose", "accessories"],
              },
            },
            required: ["overallScore", "issues", "recommendations", "appearanceProfile"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      return {
        overallScore: Math.min(100, Math.max(0, parsed.overallScore || 0)),
        issues: parsed.issues || [],
        recommendations: parsed.recommendations || [],
        appearanceProfile: parsed.appearanceProfile || {
          clothing: [],
          expression: [],
          pose: [],
          accessories: [],
        },
      };
    }
  } catch (error) {
    console.error("[Character Consistency] Analysis failed:", error);
  }

  // Fallback: basic consistency check
  return performBasicConsistencyCheck(appearances);
}

/**
 * Perform basic consistency check without LLM
 */
function performBasicConsistencyCheck(
  appearances: Array<{ frameId: number; shotNumber: number; appearance: CharacterAppearance }>
): CharacterConsistencyAnalysis {
  const issues: CharacterConsistencyAnalysis["issues"] = [];
  const clothingSet = new Set<string>();
  const expressionSet = new Set<string>();
  const poseSet = new Set<string>();
  const accessoriesSet = new Set<string>();

  appearances.forEach((a) => {
    clothingSet.add(a.appearance.clothing);
    expressionSet.add(a.appearance.expression);
    poseSet.add(a.appearance.pose);
    if (a.appearance.accessories) {
      accessoriesSet.add(a.appearance.accessories);
    }
  });

  // Flag if clothing changes too much
  if (clothingSet.size > appearances.length * 0.5) {
    appearances.forEach((a, idx) => {
      if (idx > 0 && appearances[idx - 1].appearance.clothing !== a.appearance.clothing) {
        issues.push({
          frameId: a.frameId,
          shotNumber: a.shotNumber,
          issue: "Clothing changed from previous frame",
          severity: "high",
          suggestion: "Verify wardrobe continuity or justify costume change in narrative",
        });
      }
    });
  }

  const overallScore = Math.max(
    0,
    100 - (clothingSet.size - 1) * 20 - (expressionSet.size - 1) * 5 - (poseSet.size - 1) * 3
  );

  return {
    overallScore: Math.min(100, overallScore),
    issues,
    recommendations: [
      `Character appears in ${clothingSet.size} different outfit(s)`,
      `Character shows ${expressionSet.size} different expression(s)`,
      `Character has ${poseSet.size} different pose(s)`,
    ],
    appearanceProfile: {
      clothing: Array.from(clothingSet),
      expression: Array.from(expressionSet),
      pose: Array.from(poseSet),
      accessories: Array.from(accessoriesSet),
    },
  };
}

/**
 * Compare two character appearances for consistency
 */
export async function compareCharacterAppearances(
  appearance1: CharacterAppearance,
  appearance2: CharacterAppearance,
  context?: string
): Promise<{
  isConsistent: boolean;
  score: number;
  differences: string[];
  suggestions: string[];
}> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a film continuity expert. Compare two character appearances and determine if they are consistent for the same scene.",
        },
        {
          role: "user",
          content: `Compare these two character appearances:
          
Appearance 1: Clothing: ${appearance1.clothing}, Expression: ${appearance1.expression}, Pose: ${appearance1.pose}${appearance1.accessories ? `, Accessories: ${appearance1.accessories}` : ""}

Appearance 2: Clothing: ${appearance2.clothing}, Expression: ${appearance2.expression}, Pose: ${appearance2.pose}${appearance2.accessories ? `, Accessories: ${appearance2.accessories}` : ""}

${context ? `Context: ${context}` : ""}

Return JSON with: isConsistent (boolean), score (0-100), differences (array), suggestions (array)`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "appearance_comparison",
          strict: true,
          schema: {
            type: "object",
            properties: {
              isConsistent: { type: "boolean" },
              score: { type: "number" },
              differences: { type: "array", items: { type: "string" } },
              suggestions: { type: "array", items: { type: "string" } },
            },
            required: ["isConsistent", "score", "differences", "suggestions"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      return {
        isConsistent: parsed.isConsistent || false,
        score: Math.min(100, Math.max(0, parsed.score || 0)),
        differences: parsed.differences || [],
        suggestions: parsed.suggestions || [],
      };
    }
  } catch (error) {
    console.error("[Character Consistency] Comparison failed:", error);
  }

  // Fallback: simple comparison
  const differences: string[] = [];
  if (appearance1.clothing !== appearance2.clothing) differences.push("Clothing differs");
  if (appearance1.expression !== appearance2.expression) differences.push("Expression differs");
  if (appearance1.pose !== appearance2.pose) differences.push("Pose differs");
  if (appearance1.accessories !== appearance2.accessories) differences.push("Accessories differ");

  return {
    isConsistent: differences.length === 0,
    score: Math.max(0, 100 - differences.length * 25),
    differences,
    suggestions: differences.length > 0 ? ["Review continuity between frames"] : ["Appearances are consistent"],
  };
}

/**
 * Generate appearance recommendations based on brand guidelines
 */
export async function generateAppearanceRecommendations(
  characterName: string,
  brandGuidelines: {
    aesthetic: string;
    mission: string;
    coreMessaging: string;
  },
  context?: string
): Promise<CharacterAppearance> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a character designer creating consistent appearances that align with brand guidelines.
          Generate a detailed character appearance description.`,
        },
        {
          role: "user",
          content: `Create a character appearance for "${characterName}" that aligns with these brand guidelines:
          
Aesthetic: ${brandGuidelines.aesthetic}
Mission: ${brandGuidelines.mission}
Core Messaging: ${brandGuidelines.coreMessaging}

${context ? `Additional Context: ${context}` : ""}

Return JSON with: clothing (string), expression (string), pose (string), accessories (string), notes (string)`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "character_appearance",
          strict: true,
          schema: {
            type: "object",
            properties: {
              clothing: { type: "string" },
              expression: { type: "string" },
              pose: { type: "string" },
              accessories: { type: "string" },
              notes: { type: "string" },
            },
            required: ["clothing", "expression", "pose", "accessories"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === "string") {
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("[Character Consistency] Recommendation generation failed:", error);
  }

  return {
    clothing: "Professional attire",
    expression: "Neutral",
    pose: "Standing",
    accessories: "None",
  };
}
