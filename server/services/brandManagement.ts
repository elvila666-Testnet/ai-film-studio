import { invokeLLM } from "../_core/llm";
import { parseAgentJSON } from "./agents/_agentUtils";

export interface BrandAnalysis {
  brandVoice: string;
  visualIdentity: string;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
  };
  keyVisualElements: string[];
}

export interface CharacterOption {
  imageUrl: string;
  description: string;
  demographic: string;
  compatibility: number; // 0-100
}

const BRAND_ANALYSIS_FALLBACK: BrandAnalysis = {
  brandVoice: "Authentic and grounded",
  visualIdentity: "Cinematic, natural lighting",
  colorPalette: {
    primary: "#000000",
    secondary: "#ffffff",
    accent: "#3b82f6",
    neutral: "#f3f4f6"
  },
  keyVisualElements: ["Natural textures", "Clean compositions"]
};

/**
 * Brand Management Service
 * Handles Brand Brain analysis and character generation
 */
export class BrandManagementService {
  /**
   * Analyze product images to extract brand identity
   */
  static async analyzeBrandIdentity(
    productImageUrls: string[]
  ): Promise<BrandAnalysis> {
    try {
      const imageContents = productImageUrls.map((url) => ({
        type: "image_url" as const,
        image_url: { url, detail: "high" as const },
      }));

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a world-class Brand Strategist and Creative Director. Analyze the provided product images to extract its "Strategic DNA". 
Focus on:
1. Brand Voice: The narrative soul, tone of voice (e.g., rebellious, heritage, high-tech), and communication personality.
2. Visual Identity: The cinematographic design language, specific lighting styles (e.g., Chiaroscuro, High-Key), material textures, and compositional preferences.
3. Color Palette: Extract EXACT hex codes for Primary, Secondary, Accent, and Neutral colors that define the brand's universe.
4. Key Visual Elements: Iconic motifs, recurring shapes, or stylistic "shorthand" that make the brand instanty recognizable.

Respond in strict JSON format:
{
  "brandVoice": "...",
  "visualIdentity": "...",
  "colorPalette": {
    "primary": "#...",
    "secondary": "#...",
    "accent": "#...",
    "neutral": "#..."
  },
  "keyVisualElements": ["...", "..."]
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze these product images and extract the brand identity.",
              },
              ...imageContents,
            ],
          },
        ],
        response_format: {
          type: "json_object"
        },
      });

      const content = response.choices[0]?.message?.content;
      return parseAgentJSON<BrandAnalysis>(content, "BrandManagement.analyzeBrandIdentity", BRAND_ANALYSIS_FALLBACK);
    } catch (error) {
      console.error("[BrandManagement] analyzeBrandIdentity failed:", error);
      return BRAND_ANALYSIS_FALLBACK;
    }
  }

  /**
   * Generate character options based on brand identity
   */
  static async generateCharacterOptions(
    brandAnalysis: BrandAnalysis,
    targetDemographic: string,
    count: number = 4
  ): Promise<CharacterOption[]> {
    try {
      const prompt = `Based on the following brand identity, generate ${count} diverse character options that would be perfect brand ambassadors:

Brand Voice: ${brandAnalysis.brandVoice}
Visual Identity: ${brandAnalysis.visualIdentity}
Color Palette: ${JSON.stringify(brandAnalysis.colorPalette)}
Key Visual Elements: ${brandAnalysis.keyVisualElements.join(", ")}

Target Demographic: ${targetDemographic}

For each character, provide:
1. A detailed visual description (for image generation)
2. Character personality and traits
3. Why they fit the brand

Format as JSON array with objects containing: description, demographic, compatibility (0-100)`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a casting director for brand advertising. Generate character profiles that align with brand identity.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      const parsed = parseAgentJSON<{ characters?: any[] } | any[]>(content, "BrandManagement.generateCharacterOptions", []);

      const characterDescriptions = Array.isArray(parsed) ? parsed : (parsed.characters || []);
      const characters: CharacterOption[] = [];

      for (const desc of characterDescriptions) {
        characters.push({
          imageUrl: "draft",
          description: desc.description || desc.visualDescription || "A cinematic character for the brand.",
          demographic: desc.demographic || targetDemographic,
          compatibility: desc.compatibility || 75,
        });
      }

      return characters.slice(0, count);
    } catch (error) {
      console.error("[BrandManagement] generateCharacterOptions failed:", error);
      return [];
    }
  }

  /**
   * Create moodboard collage from brand identity
   */
  static async generateMoodboard(
    brandAnalysis: BrandAnalysis,
    style: string
  ): Promise<string> {
    try {
      const prompt = `Create a visual moodboard that represents this brand:

Brand Voice: ${brandAnalysis.brandVoice}
Visual Identity: ${brandAnalysis.visualIdentity}
Color Palette: ${JSON.stringify(brandAnalysis.colorPalette)}
Style: ${style}

Generate a cohesive mood board image that captures the essence of this brand. Include color swatches, textures, typography examples, and lifestyle imagery that reflects the brand's identity.`;

      const { generateStoryboardImage } = await import("./aiGeneration");
      const imageUrl = await generateStoryboardImage(
        prompt,
        "flux-pro", // Flux Pro is great for moodboards
        undefined,
        "system"
      );

      return imageUrl;
    } catch (error) {
      console.error("[BrandManagement] generateMoodboard failed:", error);
      return "";
    }
  }
}
