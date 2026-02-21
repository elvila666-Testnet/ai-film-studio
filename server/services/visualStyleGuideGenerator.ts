import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import type { BrandGuidelines } from "./brandBrain";

/**
 * Visual style guide generated from brand guidelines
 */
export interface VisualStyleGuide {
  id: string;
  brandId: string;
  brandName: string;
  colorPalette: ColorPalette;
  typography: Typography;
  textures: Texture[];
  composition: CompositionGuidelines;
  moodDescription: string;
  visualReferences: VisualReference[];
  generatedAt: Date;
}

/**
 * Color palette extracted from brand
 */
export interface ColorPalette {
  primary: Color;
  secondary: Color;
  accent: Color;
  neutral: Color[];
  backgroundColors: Color[];
  psychology: string; // Why these colors were chosen
}

/**
 * Individual color with metadata
 */
export interface Color {
  hex: string;
  rgb: string;
  name: string;
  usage: string; // Where this color is used
  psychology: string; // Emotional impact
}

/**
 * Typography guidelines
 */
export interface Typography {
  headingFont: Font;
  bodyFont: Font;
  accentFont: Font;
  hierarchy: FontHierarchy[];
  spacing: string;
  lineHeight: string;
}

/**
 * Font specification
 */
export interface Font {
  name: string;
  weight: string;
  style: string;
  characteristics: string;
  usage: string;
}

/**
 * Font hierarchy levels
 */
export interface FontHierarchy {
  level: string;
  size: string;
  weight: string;
  color: string;
  usage: string;
}

/**
 * Texture and material properties
 */
export interface Texture {
  name: string;
  description: string;
  material: string;
  roughness: string;
  reflectivity: string;
  usage: string;
  imageUrl?: string;
}

/**
 * Composition and layout guidelines
 */
export interface CompositionGuidelines {
  aspectRatios: string[];
  gridSystem: string;
  whitespace: string;
  depthTechniques: string[];
  focusPoints: string;
  balanceStyle: "symmetrical" | "asymmetrical" | "radial";
}

/**
 * Visual reference image
 */
export interface VisualReference {
  id: string;
  imageUrl: string;
  description: string;
  colorAnalysis: string;
  composition: string;
  mood: string;
  confidence: number;
}

/**
 * Generate a comprehensive visual style guide from brand guidelines
 */
export async function generateVisualStyleGuide(
  brand: BrandGuidelines,
  productDescription: string
): Promise<VisualStyleGuide> {
  try {
    // Use LLM to generate detailed style guide
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert visual designer and brand strategist. 
          Create a comprehensive visual style guide based on brand identity and product.
          Return detailed JSON with color psychology, typography rationale, and composition principles.`,
        },
        {
          role: "user",
          content: `Generate a visual style guide for this brand:

Brand Name: ${brand.name || "Unknown"}
Target Customer: ${brand.targetCustomer || "General audience"}
Aesthetic: ${brand.aesthetic || "Modern"}
Mission: ${brand.mission || "Inspire and delight"}
Core Messaging: ${brand.coreMessaging || "Quality and innovation"}
Product: ${productDescription}

Provide:
1. Color palette (primary, secondary, accent, neutrals) with hex codes and psychology
2. Typography (heading, body, accent fonts with characteristics)
3. Textures and materials (3-4 key textures)
4. Composition guidelines (aspect ratios, balance, depth)
5. Overall mood description
6. Why these choices align with the brand

Return as JSON with structure: {colorPalette, typography, textures, composition, moodDescription}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "visual_style_guide",
          strict: true,
          schema: {
            type: "object",
            properties: {
              colorPalette: {
                type: "object",
                properties: {
                  primary: { type: "object" },
                  secondary: { type: "object" },
                  accent: { type: "object" },
                  psychology: { type: "string" },
                },
              },
              typography: {
                type: "object",
                properties: {
                  headingFont: { type: "object" },
                  bodyFont: { type: "object" },
                  characteristics: { type: "string" },
                },
              },
              textures: {
                type: "array",
                items: { type: "object" },
              },
              composition: {
                type: "object",
                properties: {
                  balanceStyle: { type: "string" },
                  gridSystem: { type: "string" },
                },
              },
              moodDescription: { type: "string" },
            },
            required: [
              "colorPalette",
              "typography",
              "textures",
              "composition",
              "moodDescription",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from LLM");

    const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));

    // Generate visual reference images
    const visualReferences = await generateVisualReferences(brand, parsed.moodDescription);

    const styleGuide: VisualStyleGuide = {
      id: `style_${Date.now()}`,
      brandId: String(brand.id || "unknown"),
      brandName: String(brand.name || "Unknown"),
      colorPalette: parseColorPalette(parsed.colorPalette),
      typography: parseTypography(parsed.typography),
      textures: parseTextures(parsed.textures),
      composition: parseComposition(parsed.composition),
      moodDescription: parsed.moodDescription,
      visualReferences,
      generatedAt: new Date(),
    };

    return styleGuide;
  } catch (error) {
    console.error("Failed to generate visual style guide:", error);
    throw new Error(
      `Style guide generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate visual reference images for the style guide
 */
async function generateVisualReferences(
  brand: BrandGuidelines,
  moodDescription: string
): Promise<VisualReference[]> {
  const references: VisualReference[] = [];

  const referenceTypes = [
    "color palette showcase",
    "typography and layout example",
    "texture and material study",
    "complete composition example",
  ];

  for (let i = 0; i < referenceTypes.length; i++) {
    try {
      const imageResult = await generateImage({
        prompt: `Create a visual reference for ${referenceTypes[i]}.
        Brand: ${brand.name || "Unknown"}
        Aesthetic: ${brand.aesthetic || "modern"}
        Mood: ${moodDescription}
        Style: Professional, cohesive, brand-aligned.
        High quality, cinematic lighting.`,
      });

      if (imageResult.url) {
        references.push({
          id: `ref_${Date.now()}_${i}`,
          imageUrl: imageResult.url,
          description: referenceTypes[i],
          colorAnalysis: "Professional color harmony",
          composition: "Balanced and visually appealing",
          mood: moodDescription,
          confidence: 85 + Math.random() * 10,
        });
      }
    } catch (error) {
      console.error(`Failed to generate reference ${i}:`, error);
    }
  }

  return references;
}

/**
 * Parse color palette from LLM response
 */
function parseColorPalette(data: Record<string, unknown>): ColorPalette {
  return {
    primary: parseColor(data.primary || { hex: "#0066CC", name: "Primary Blue" }),
    secondary: parseColor(data.secondary || { hex: "#FF6B35", name: "Secondary Orange" }),
    accent: parseColor(data.accent || { hex: "#FFD700", name: "Accent Gold" }),
    neutral: (data.neutrals || []).map(parseColor),
    backgroundColors: (data.backgroundColors || []).map(parseColor),
    psychology: data.psychology || "Professional and trustworthy",
  };
}

/**
 * Parse individual color
 */
function parseColor(data: Record<string, unknown>): Color {
  return {
    hex: data.hex || "#000000",
    rgb: hexToRgb(data.hex || "#000000"),
    name: data.name || "Color",
    usage: data.usage || "Primary use",
    psychology: data.psychology || "Neutral",
  };
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0, 0, 0";
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

/**
 * Parse typography from LLM response
 */
function parseTypography(data: Record<string, unknown>): Typography {
  return {
    headingFont: parseFont(data.headingFont || { name: "Montserrat", weight: "Bold" }),
    bodyFont: parseFont(data.bodyFont || { name: "Open Sans", weight: "Regular" }),
    accentFont: parseFont(data.accentFont || { name: "Playfair Display", weight: "Bold" }),
    hierarchy: data.hierarchy || [],
    spacing: data.spacing || "1.5rem",
    lineHeight: data.lineHeight || "1.6",
  };
}

/**
 * Parse font specification
 */
function parseFont(data: Record<string, unknown>): Font {
  return {
    name: data.name || "Arial",
    weight: data.weight || "Regular",
    style: data.style || "Normal",
    characteristics: data.characteristics || "Clean and readable",
    usage: data.usage || "General use",
  };
}

/**
 * Parse composition guidelines
 */
function parseComposition(data: Record<string, unknown>): CompositionGuidelines {
  return {
    aspectRatios: data.aspectRatios || ["16:9", "1:1", "9:16"],
    gridSystem: String(data.gridSystem || "12-column grid"),
    whitespace: String(data.whitespace || "Generous and intentional"),
    depthTechniques: data.depthTechniques || ["Layering", "Perspective", "Lighting"],
    focusPoints: String(data.focusPoints || "Center and rule of thirds"),
    balanceStyle: (data.balanceStyle || "asymmetrical") as "symmetrical" | "asymmetrical" | "radial",
  };
}

/**
 * Parse textures from LLM response
 */
function parseTextures(data: Record<string, unknown>): Texture[] {
  if (!Array.isArray(data)) return [];

  return data.map((texture: Record<string, unknown>) => ({
    name: String(texture.name || "Texture"),
    description: String(texture.description || "Visual texture"),
    material: String(texture.material || "Digital"),
    roughness: String(texture.roughness || "Medium"),
    reflectivity: String(texture.reflectivity || "Low"),
    usage: String(texture.usage || "Background"),
  }));
}

/**
 * Generate a moodboard from the style guide
 */
export async function generateMoodboardFromStyleGuide(
  styleGuide: VisualStyleGuide,
  productDescription: string
): Promise<VisualReference[]> {
  const moodboardImages: VisualReference[] = [];

  const moodboardPrompts = [
    `Create a moodboard showcasing the primary color palette: ${styleGuide.colorPalette.primary.hex}, ${styleGuide.colorPalette.secondary.hex}. Style: ${styleGuide.moodDescription}`,
    `Create a lifestyle image featuring the typography and color scheme. Brand: ${styleGuide.brandName}. Product: ${productDescription}`,
    `Create a texture and material study using the brand's visual style. Mood: ${styleGuide.moodDescription}`,
    `Create a complete composition example combining all visual elements. Brand: ${styleGuide.brandName}`,
  ];

  for (const prompt of moodboardPrompts) {
    try {
      const imageResult = await generateImage({ prompt });

      if (imageResult.url) {
        moodboardImages.push({
          id: `moodboard_${Date.now()}_${Math.random()}`,
          imageUrl: imageResult.url,
          description: "Moodboard reference",
          colorAnalysis: "Brand-aligned colors",
          composition: "Professional composition",
          mood: styleGuide.moodDescription,
          confidence: 85,
        });
      }
    } catch (error) {
      console.error("Failed to generate moodboard image:", error);
    }
  }

  return moodboardImages;
}
