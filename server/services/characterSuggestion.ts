/**
 * Character Suggestion AI Service
 * Suggests characters from brand library based on script and brand guidelines
 */

import { invokeLLM } from "../_core/llm";
import { CharacterLibrary } from "../../drizzle/schema";
import { BrandGuidelines } from "./brandBrain";

export interface CharacterSuggestion {
  characterId: number;
  name: string;
  matchScore: number; // 0-100
  reasoning: string;
  roleInScript: string;
}

export interface CharacterSuggestionResult {
  suggestions: CharacterSuggestion[];
  analysis: string;
}

/**
 * Suggest characters from library based on script and brand guidelines
 */
export async function suggestCharactersForScript(
  brand: BrandGuidelines,
  script: string,
  characterLibrary: CharacterLibrary[]
): Promise<CharacterSuggestionResult> {
  try {
    if (characterLibrary.length === 0) {
      return {
        suggestions: [],
        analysis: "No characters in brand library. Please add characters first.",
      };
    }

    // Extract character roles from script
    const roles = extractCharacterRoles(script);

    // Build character library description
    const libraryDescription = characterLibrary
      .map(
        (char) =>
          `- ${char.name}: ${char.description} (Traits: ${char.traits || "N/A"}, Locked: ${char.isLocked})`
      )
      .join("\n");

    // Use LLM to match characters to roles
    const prompt = `You are a casting director for a film production. Given the brand guidelines and character library, suggest the best characters for each role in the script.

Brand Guidelines:
- Target Customer: ${brand.targetCustomer || "Not specified"}
- Aesthetic: ${brand.aesthetic || "Not specified"}
- Mission: ${brand.mission || "Not specified"}
- Core Messaging: ${brand.coreMessaging || "Not specified"}

Character Library:
${libraryDescription}

Script Roles Needed:
${roles.map((role) => `- ${role}`).join("\n")}

For each role, provide:
1. Best matching character name
2. Match score (0-100)
3. Reasoning for the match
4. How this character serves the brand guidelines

Format your response as JSON with this structure:
{
  "suggestions": [
    {
      "characterName": "string",
      "matchScore": number,
      "reasoning": "string",
      "roleInScript": "string"
    }
  ],
  "analysis": "string"
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a casting director AI that matches characters to roles while maintaining brand consistency.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "character_suggestions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    characterName: { type: "string" },
                    matchScore: { type: "number" },
                    reasoning: { type: "string" },
                    roleInScript: { type: "string" },
                  },
                  required: ["characterName", "matchScore", "reasoning", "roleInScript"],
                  additionalProperties: false,
                },
              },
              analysis: { type: "string" },
            },
            required: ["suggestions", "analysis"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    const parsed = JSON.parse(contentStr);

    // Map character names back to IDs
    const suggestions: CharacterSuggestion[] = parsed.suggestions
      .map((sugg: Record<string, unknown>) => {
        const character = characterLibrary.find((c) => c.name === sugg.characterName);
        if (!character) return null;

        return {
          characterId: character.id,
          name: character.name,
          matchScore: sugg.matchScore,
          reasoning: sugg.reasoning,
          roleInScript: sugg.roleInScript,
        };
      })
      .filter((s: CharacterSuggestion | null) => s !== null);

    return {
      suggestions,
      analysis: parsed.analysis,
    };
  } catch (error) {
    console.error("Failed to suggest characters:", error);
    throw error;
  }
}

/**
 * Extract character roles from script
 */
function extractCharacterRoles(script: string): string[] {
  const roles: string[] = [];

  // Look for character names in ALL CAPS followed by dialogue
  const characterPattern = /^([A-Z][A-Z\s]+)\n/gm;
  let match;

  while ((match = characterPattern.exec(script)) !== null) {
    const name = match[1].trim();
    if (name.length > 0 && name.length < 50 && !roles.includes(name)) {
      roles.push(name);
    }
  }

  return roles.slice(0, 10); // Limit to 10 characters
}

/**
 * Score character match to a specific role
 */
export async function scoreCharacterForRole(
  brand: BrandGuidelines,
  character: CharacterLibrary,
  role: string,
  roleContext: string
): Promise<number> {
  try {
    const prompt = `Given a character and a role in a script, score how well the character matches the role while maintaining brand consistency.

Brand Guidelines:
- Aesthetic: ${brand.aesthetic || "Not specified"}
- Mission: ${brand.mission || "Not specified"}
- Core Messaging: ${brand.coreMessaging || "Not specified"}

Character:
- Name: ${character.name}
- Description: ${character.description}
- Traits: ${character.traits || "Not specified"}

Role:
- Name: ${role}
- Context: ${roleContext}

Provide a score from 0-100 where:
- 90-100: Perfect match for role and brand
- 70-89: Good match with minor considerations
- 50-69: Acceptable match but some concerns
- 30-49: Weak match, better alternatives likely exist
- 0-29: Poor match, not recommended

Respond with ONLY a JSON object: { "score": number, "reasoning": "string" }`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a casting director AI that evaluates character-role matches.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return 50;

    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    const parsed = JSON.parse(contentStr);
    return Math.min(100, Math.max(0, parsed.score || 50));
  } catch (error) {
    console.error("Failed to score character:", error);
    return 50; // Default neutral score
  }
}

/**
 * Get character consistency check for multiple appearances
 */
export async function checkCharacterConsistency(
  character: CharacterLibrary,
  appearances: string[]
): Promise<{
  isConsistent: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
}> {
  try {
    const prompt = `Analyze if a character appears consistent across multiple script appearances.

Character:
- Name: ${character.name}
- Description: ${character.description}
- Traits: ${character.traits || "Not specified"}

Script Appearances:
${appearances.map((app, i) => `${i + 1}. ${app}`).join("\n")}

Check for:
1. Consistent personality and behavior
2. Consistent physical appearance descriptions
3. Consistent dialogue style
4. Any contradictions or inconsistencies

Respond with JSON: {
  "isConsistent": boolean,
  "score": number (0-100),
  "issues": ["string"],
  "recommendations": ["string"]
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a script analyst checking character consistency.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        isConsistent: true,
        score: 100,
        issues: [],
        recommendations: [],
      };
    }

    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    return JSON.parse(contentStr);
  } catch (error) {
    console.error("Failed to check character consistency:", error);
    return {
      isConsistent: true,
      score: 100,
      issues: [],
      recommendations: [],
    };
  }
}
