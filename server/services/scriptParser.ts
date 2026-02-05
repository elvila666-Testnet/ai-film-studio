/**
 * Script Parser Service
 * Extracts character names and descriptions from screenplay text
 */

export interface ExtractedCharacter {
  name: string;
  description: string;
  appearances: number;
  firstAppearance: number;
}

/**
 * Extract character names from script
 * Looks for character names in dialogue and action lines
 */
export function extractCharacterNames(scriptText: string): string[] {
  const lines = scriptText.split('\n');
  const characterNames = new Set<string>();

  // Pattern for character names in dialogue (typically in caps on their own line)
  const dialoguePattern = /^[A-Z][A-Z\s\-']+$/;
  
  // Pattern for character names in action (e.g., "JOHN enters the room")
  const actionPattern = /\b([A-Z][A-Z]+)\s+(enters|exits|walks|runs|sits|stands|looks|speaks|says|yells|whispers|shouts|laughs|cries|screams|nods|shakes|points|reaches|grabs|throws|catches|falls|jumps|climbs|opens|closes|picks|puts|takes|gives|shows|tells|asks|answers|calls|waits|watches|sees|hears|smells|tastes|feels|thinks|remembers|forgets|knows|learns|teaches|helps|hurts|loves|hates|fears|hopes|wishes|wants|needs|tries|fails|succeeds|begins|ends|continues|stops|starts|finishes)\b/gi;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check for dialogue character names
    if (dialoguePattern.test(trimmedLine) && trimmedLine.length < 50) {
      characterNames.add(trimmedLine);
    }
    
    // Check for character names in action
    let match;
    const actionRegex = new RegExp(actionPattern.source, actionPattern.flags);
    while ((match = actionRegex.exec(trimmedLine)) !== null) {
      const name = match[1];
      if (name && name.length > 1 && name.length < 30) {
        characterNames.add(name);
      }
    }
  }

  return Array.from(characterNames).filter(name => name.length > 1);
}

/**
 * Extract character descriptions from script
 * Looks for character descriptions in action lines and parentheticals
 */
export function extractCharacterDescriptions(scriptText: string): Record<string, string> {
  const lines = scriptText.split('\n');
  const descriptions: Record<string, string> = {};
  const characterNames = extractCharacterNames(scriptText);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for lines that mention character names with descriptions
    for (const character of characterNames) {
      // Pattern: "CHARACTER - description" or "CHARACTER is description"
      const descPattern = new RegExp(`\\b${character}\\b[\\s\\-]*(?:is|appears|looks|seems|wears|has)\\s+(.+?)(?:\\.|$)`, 'i');
      const match = line.match(descPattern);
      
      if (match && match[1]) {
        const desc = match[1].trim();
        if (desc.length > 5 && desc.length < 200) {
          descriptions[character] = desc;
        }
      }
    }
  }

  return descriptions;
}

/**
 * Extract character appearance details from script
 * Uses LLM to understand character descriptions better
 */
export async function extractCharacterAppearances(
  scriptText: string,
  characterNames: string[]
): Promise<Record<string, string>> {
  const { invokeLLM } = await import("../_core/llm");

  const prompt = `Analyze this screenplay and extract detailed physical appearance descriptions for each character mentioned. Focus on visual details like age, hair, clothing, build, distinctive features, etc.

Characters to describe: ${characterNames.join(", ")}

Script excerpt:
${scriptText.substring(0, 2000)}

For each character, provide a concise 1-2 sentence appearance description. Format as:
CHARACTER_NAME: appearance description

If a character has no clear appearance description in the script, infer a reasonable description based on context.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a screenplay analyst. Extract and describe character appearances from scripts in a concise, visual way suitable for image generation prompts.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = (response.choices?.[0]?.message?.content || "") as string;
    const descriptions: Record<string, string> = {};

    // Parse the response
    const lines = content.split("\n");
    for (const line of lines) {
      const [name, description] = line.split(":").map(s => s.trim());
      if (name && description && characterNames.some(cn => cn.toLowerCase() === name.toLowerCase())) {
        descriptions[name] = description;
      }
    }

    return descriptions;
  } catch (error) {
    console.warn("Failed to extract character appearances with LLM:", error);
    return {};
  }
}

/**
 * Analyze script and extract all character information
 */
export async function analyzeScriptForCharacters(scriptText: string): Promise<Record<string, string>> {
  // First, extract basic character names
  const characterNames = extractCharacterNames(scriptText);
  
  if (characterNames.length === 0) {
    return {};
  }

  // Try to extract descriptions from the script text directly
  let descriptions = extractCharacterDescriptions(scriptText);

  // If we don't have enough descriptions, use LLM to infer them
  if (Object.keys(descriptions).length < characterNames.length) {
    try {
      const llmDescriptions = await extractCharacterAppearances(scriptText, characterNames);
      descriptions = { ...descriptions, ...llmDescriptions };
    } catch (error) {
      console.warn("LLM character extraction failed, using basic extraction:", error);
    }
  }

  // Ensure all characters have at least a basic description
  for (const character of characterNames) {
    if (!descriptions[character]) {
      descriptions[character] = `A character named ${character}`;
    }
  }

  return descriptions;
}

/**
 * Count character appearances in script
 */
export function countCharacterAppearances(scriptText: string, characterName: string): number {
  const pattern = new RegExp(`\\b${characterName}\\b`, "gi");
  const matches = scriptText.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Get character statistics
 */
export function getCharacterStatistics(scriptText: string): Array<{
  name: string;
  appearances: number;
  percentage: number;
}> {
  const characterNames = extractCharacterNames(scriptText);
  const stats = characterNames.map(name => ({
    name,
    appearances: countCharacterAppearances(scriptText, name),
  }));

  const totalAppearances = stats.reduce((sum, s) => sum + s.appearances, 0);

  return stats
    .map((s: {name: string; appearances: number}) => ({
      ...s,
      percentage: totalAppearances > 0 ? (s.appearances / totalAppearances) * 100 : 0,
    }))
    .sort((a: any, b: any) => b.appearances - a.appearances);
}

/**
 * Validate extracted characters
 */
export function validateCharacterExtraction(
  characters: Record<string, string>
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (Object.keys(characters).length === 0) {
    issues.push("No characters extracted from script");
  }

  for (const [name, description] of Object.entries(characters)) {
    if (!name || name.length < 2) {
      issues.push(`Invalid character name: "${name}"`);
    }
    if (!description || description.length < 5) {
      issues.push(`Character "${name}" has insufficient description`);
    }
    if (description.length > 500) {
      issues.push(`Character "${name}" description is too long`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
