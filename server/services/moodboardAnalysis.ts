/**
 * Moodboard AI Analysis Service
 * Analyzes moodboard images for color palette, composition, and style
 * Generates visual guidelines from moodboard analysis
 */

import { invokeLLM } from "../_core/llm";

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  colors: Array<{
    hex: string;
    name: string;
    frequency: number; // 0-100
  }>;
}

export interface CompositionAnalysis {
  patterns: string[];
  balance: "symmetrical" | "asymmetrical" | "radial";
  depth: "flat" | "shallow" | "deep";
  lighting: string;
  framing: string[];
  dominantElements: string[];
}

export interface StyleAnalysis {
  mood: string[];
  era: string;
  genre: string;
  techniques: string[];
  atmosphere: string;
}

export interface MoodboardAnalysisResult {
  colorPalette: ColorPalette;
  composition: CompositionAnalysis;
  style: StyleAnalysis;
  visualGuidelines: string;
  summary: string;
}

/**
 * Analyze a moodboard image for color palette
 */
export async function analyzeColorPalette(imageUrl: string): Promise<ColorPalette> {
  try {
    const prompt = `Analyze this image and extract its color palette. Identify the primary, secondary, and accent colors, plus any neutral colors used.

For each color, provide:
1. Hex code
2. Color name
3. Frequency (0-100, how much of the image uses this color)

Respond with JSON:
{
  "primary": "#XXXXXX",
  "secondary": "#XXXXXX",
  "accent": "#XXXXXX",
  "neutral": "#XXXXXX",
  "colors": [
    { "hex": "#XXXXXX", "name": "string", "frequency": number }
  ]
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a color theory expert analyzing images for design purposes.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from LLM");

    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    return JSON.parse(contentStr);
  } catch (error) {
    console.error("Failed to analyze color palette:", error);
    // Return default palette
    return {
      primary: "#000000",
      secondary: "#FFFFFF",
      accent: "#0066CC",
      neutral: "#808080",
      colors: [],
    };
  }
}

/**
 * Analyze a moodboard image for composition
 */
export async function analyzeComposition(imageUrl: string): Promise<CompositionAnalysis> {
  try {
    const prompt = `Analyze the composition of this image. Identify:

1. Compositional patterns (rule of thirds, golden ratio, leading lines, etc.)
2. Balance type (symmetrical, asymmetrical, or radial)
3. Depth (flat, shallow, or deep)
4. Lighting style and direction
5. Framing techniques used
6. Dominant visual elements

Respond with JSON:
{
  "patterns": ["string"],
  "balance": "symmetrical|asymmetrical|radial",
  "depth": "flat|shallow|deep",
  "lighting": "string",
  "framing": ["string"],
  "dominantElements": ["string"]
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a cinematography expert analyzing visual composition.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from LLM");

    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    return JSON.parse(contentStr);
  } catch (error) {
    console.error("Failed to analyze composition:", error);
    return {
      patterns: [],
      balance: "asymmetrical",
      depth: "shallow",
      lighting: "Unknown",
      framing: [],
      dominantElements: [],
    };
  }
}

/**
 * Analyze a moodboard image for style
 */
export async function analyzeStyle(imageUrl: string): Promise<StyleAnalysis> {
  try {
    const prompt = `Analyze the visual style of this image. Identify:

1. Mood/emotional tone (list 3-5 adjectives)
2. Era/time period (vintage, contemporary, futuristic, etc.)
3. Genre (documentary, fantasy, noir, romance, etc.)
4. Artistic techniques used
5. Overall atmosphere

Respond with JSON:
{
  "mood": ["string"],
  "era": "string",
  "genre": "string",
  "techniques": ["string"],
  "atmosphere": "string"
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an art director analyzing visual style and mood.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from LLM");

    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    return JSON.parse(contentStr);
  } catch (error) {
    console.error("Failed to analyze style:", error);
    return {
      mood: [],
      era: "Unknown",
      genre: "Unknown",
      techniques: [],
      atmosphere: "Unknown",
    };
  }
}

/**
 * Perform complete moodboard analysis
 */
export async function analyzeMoodboardImage(imageUrl: string): Promise<MoodboardAnalysisResult> {
  try {
    // Run all analyses in parallel
    const [colorPalette, composition, style] = await Promise.all([
      analyzeColorPalette(imageUrl),
      analyzeComposition(imageUrl),
      analyzeStyle(imageUrl),
    ]);

    // Generate visual guidelines from analysis
    const visualGuidelines = generateVisualGuidelines(colorPalette, composition, style);

    // Create summary
    const summary = `This moodboard image features a ${style.era} ${style.genre} aesthetic with ${style.mood.join(", ")} mood. The composition uses ${composition.balance} balance with ${composition.depth} depth. Key colors include ${colorPalette.primary} (primary) and ${colorPalette.secondary} (secondary).`;

    return {
      colorPalette,
      composition,
      style,
      visualGuidelines,
      summary,
    };
  } catch (error) {
    console.error("Failed to analyze moodboard image:", error);
    throw error;
  }
}

/**
 * Generate visual guidelines from moodboard analysis
 */
function generateVisualGuidelines(
  colorPalette: ColorPalette,
  composition: CompositionAnalysis,
  style: StyleAnalysis
): string {
  const guidelines: string[] = [];

  // Color guidelines
  guidelines.push("## Color Palette Guidelines");
  guidelines.push(`- Primary Color: ${colorPalette.primary}`);
  guidelines.push(`- Secondary Color: ${colorPalette.secondary}`);
  guidelines.push(`- Accent Color: ${colorPalette.accent}`);
  guidelines.push(`- Use primary color for dominant elements`);
  guidelines.push(`- Use secondary color for supporting elements`);
  guidelines.push(`- Use accent color for highlights and calls-to-action`);

  // Composition guidelines
  guidelines.push("\n## Composition Guidelines");
  guidelines.push(`- Balance Type: ${composition.balance}`);
  guidelines.push(`- Depth: ${composition.depth}`);
  guidelines.push(`- Lighting: ${composition.lighting}`);
  guidelines.push(`- Compositional Patterns: ${composition.patterns.join(", ") || "None specified"}`);
  guidelines.push(`- Framing Techniques: ${composition.framing.join(", ") || "None specified"}`);
  guidelines.push(`- Dominant Elements: ${composition.dominantElements.join(", ") || "None specified"}`);

  // Style guidelines
  guidelines.push("\n## Style Guidelines");
  guidelines.push(`- Mood: ${style.mood.join(", ")}`);
  guidelines.push(`- Era: ${style.era}`);
  guidelines.push(`- Genre: ${style.genre}`);
  guidelines.push(`- Atmosphere: ${style.atmosphere}`);
  guidelines.push(`- Techniques: ${style.techniques.join(", ") || "None specified"}`);

  // Storyboard application
  guidelines.push("\n## Application to Storyboards");
  guidelines.push(`- Apply ${composition.balance} composition to shot layouts`);
  guidelines.push(`- Maintain ${composition.depth} depth in visual layers`);
  guidelines.push(`- Use ${composition.lighting} lighting approach`);
  guidelines.push(`- Ensure ${style.mood.join(" and ")} mood throughout`);
  guidelines.push(`- Reference ${style.era} aesthetic in costume and production design`);

  return guidelines.join("\n");
}

/**
 * Aggregate analysis from multiple moodboard images
 */
export async function aggregateMoodboardAnalysis(
  analyses: MoodboardAnalysisResult[]
): Promise<{
  dominantColors: string[];
  commonPatterns: string[];
  averageMood: string[];
  recommendedPalette: ColorPalette;
  overallGuidelines: string;
}> {
  if (analyses.length === 0) {
    return {
      dominantColors: [],
      commonPatterns: [],
      averageMood: [],
      recommendedPalette: {
        primary: "#000000",
        secondary: "#FFFFFF",
        accent: "#0066CC",
        neutral: "#808080",
        colors: [],
      },
      overallGuidelines: "",
    };
  }

  // Aggregate colors
  const colorFrequency: Record<string, number> = {};
  analyses.forEach((analysis) => {
    analysis.colorPalette.colors.forEach((color) => {
      colorFrequency[color.hex] = (colorFrequency[color.hex] || 0) + color.frequency;
    });
  });

  const dominantColors = Object.entries(colorFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([color]) => color);

  // Aggregate patterns
  const patternFrequency: Record<string, number> = {};
  analyses.forEach((analysis) => {
    analysis.composition.patterns.forEach((pattern) => {
      patternFrequency[pattern] = (patternFrequency[pattern] || 0) + 1;
    });
  });

  const commonPatterns = Object.entries(patternFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([pattern]) => pattern);

  // Aggregate moods
  const moodFrequency: Record<string, number> = {};
  analyses.forEach((analysis) => {
    analysis.style.mood.forEach((mood) => {
      moodFrequency[mood] = (moodFrequency[mood] || 0) + 1;
    });
  });

  const averageMood = Object.entries(moodFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([mood]) => mood);

  // Recommended palette (average of all palettes)
  const recommendedPalette: ColorPalette = {
    primary: dominantColors[0] || "#000000",
    secondary: dominantColors[1] || "#FFFFFF",
    accent: dominantColors[2] || "#0066CC",
    neutral: dominantColors[3] || "#808080",
    colors: dominantColors.map((hex, i) => ({
      hex,
      name: `Color ${i + 1}`,
      frequency: 100 - i * 15,
    })),
  };

  // Generate overall guidelines
  const overallGuidelines = `
## Aggregated Moodboard Guidelines

### Color Strategy
- Dominant Colors: ${dominantColors.join(", ")}
- Primary: ${recommendedPalette.primary}
- Secondary: ${recommendedPalette.secondary}
- Accent: ${recommendedPalette.accent}

### Composition Strategy
- Common Patterns: ${commonPatterns.join(", ") || "Varied"}
- Apply these patterns consistently across storyboard shots

### Visual Mood
- Dominant Moods: ${averageMood.join(", ")}
- Maintain these emotional tones throughout the production

### Implementation
- Use the recommended palette for all visual elements
- Apply common composition patterns to shot layouts
- Ensure all content reflects the dominant moods
- Reference moodboard images during production for consistency
`;

  return {
    dominantColors,
    commonPatterns,
    averageMood,
    recommendedPalette,
    overallGuidelines,
  };
}
