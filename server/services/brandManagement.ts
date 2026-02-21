import { invokeLLM } from "../_core/llm";

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
            content: `You are a brand identity expert. Analyze the provided product images and extract:
1. Brand Voice: The tone, personality, and communication style
2. Visual Identity: Design language, aesthetic, and visual style
3. Color Palette: Primary, secondary, accent, and neutral colors (provide hex codes)
4. Key Visual Elements: Distinctive visual features

Respond in JSON format:
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
          type: "json_schema",
          json_schema: {
            name: "brand_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                brandVoice: { type: "string" },
                visualIdentity: { type: "string" },
                colorPalette: {
                  type: "object",
                  properties: {
                    primary: { type: "string" },
                    secondary: { type: "string" },
                    accent: { type: "string" },
                    neutral: { type: "string" },
                  },
                  required: ["primary", "secondary", "accent", "neutral"],
                },
                keyVisualElements: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: [
                "brandVoice",
                "visualIdentity",
                "colorPalette",
                "keyVisualElements",
              ],
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("Invalid LLM response format");
      }

      return JSON.parse(content) as BrandAnalysis;
    } catch (error) {
      throw new Error(
        `Failed to analyze brand identity: ${error instanceof Error ? error.message : String(error)}`
      );
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
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("Invalid LLM response");
      }

      // Parse the response and generate images for each character
      const characterDescriptions = JSON.parse(content);
      const characters: CharacterOption[] = [];
      const { generateStoryboardImage } = await import("./aiGeneration");

      for (const desc of characterDescriptions) {
        // Generate image for this character using NanoBanana Pro
        const imagePrompt = `Ultra realistic 8k character portrait of ${desc.description}. Style: ${brandAnalysis.visualIdentity}. Professional headshot, studio lighting, clean background, Cinematic lighting, high detail.`;

        try {
          const imageUrl = await generateStoryboardImage(
            imagePrompt,
            "nanobanana-pro",
            undefined, // projectId is optional here
            "system"
          );

          characters.push({
            imageUrl,
            description: desc.description,
            demographic: desc.demographic,
            compatibility: desc.compatibility || 75,
          });
        } catch (err) {
          console.error(`Failed to generate character image: ${err}`);
          characters.push({
            imageUrl: "https://via.placeholder.com/512?text=Error+Generating+Image",
            description: desc.description,
            demographic: desc.demographic,
            compatibility: desc.compatibility || 75,
          });
        }
      }

      return characters;
    } catch (error) {
      throw new Error(
        `Failed to generate character options: ${error instanceof Error ? error.message : String(error)}`
      );
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
      throw new Error(
        `Failed to generate moodboard: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
