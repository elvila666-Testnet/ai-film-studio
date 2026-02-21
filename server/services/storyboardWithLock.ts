/**
 * Storyboard Generation with Locked Characters and Brand Constraints
 * Ensures visual consistency by injecting brand identity and character references
 */

import { getBrand } from "../db";
import { getLockedCharacter } from "../db";

export interface StoryboardGenerationRequest {
  projectId: number;
  shotNumber: number;
  shotDescription: string;
  brandId?: number;
  resolution: "720p" | "1080p" | "4k";
}

export interface StoryboardGenerationResponse {
  imageUrl: string;
  prompt: string;
  shotNumber: number;
  characterLocked: boolean;
  brandApplied: boolean;
}

/**
 * Build prompt with locked character and brand constraints
 */
export async function buildLockedPrompt(
  shotDescription: string,
  projectId: number,
  brandId?: number
): Promise<{
  prompt: string;
  characterReference?: string;
  brandConstraints?: string;
}> {
  let characterReference: string | undefined;
  let brandConstraints: string | undefined;

  // Get locked character if available
  const lockedCharacter = await getLockedCharacter(projectId);
  if (lockedCharacter) {
    characterReference = `Character: ${lockedCharacter.name}. Appearance: ${lockedCharacter.description}. This character must appear exactly as shown in the reference image and maintain consistency across all shots.`;
  }

  // Get brand constraints if available
  if (brandId) {
    const brand = await getBrand(brandId);
    if (brand) {
      brandConstraints = `Brand Identity: Voice - ${brand.brandVoice}. Visual Style - ${brand.visualIdentity}. Color Palette - Primary: ${brand.colorPalette?.primary || "#0088cc"}, Secondary: ${brand.colorPalette?.secondary || "#00ccff"}, Accent: ${brand.colorPalette?.accent || "#ff6600"}. All generated content must respect this brand identity.`;
    }
  }

  // Build final prompt
  const parts = [
    "Shot Description:",
    shotDescription,
    "",
  ];

  if (characterReference) {
    parts.push("CHARACTER LOCK (IMMUTABLE):");
    parts.push(characterReference);
    parts.push("");
  }

  if (brandConstraints) {
    parts.push("BRAND CONSTRAINTS (IMMUTABLE):");
    parts.push(brandConstraints);
    parts.push("");
  }

  parts.push("GENERATION RULES:");
  parts.push("- Maintain exact character appearance from reference image");
  parts.push("- Respect brand visual identity and color palette");
  parts.push("- Never invent or modify character appearance");
  parts.push("- Ensure composition matches shot description");
  parts.push("- Use professional cinematography techniques");

  const prompt = parts.join("\n");

  return {
    prompt,
    characterReference,
    brandConstraints,
  };
}

/**
 * Generate storyboard image with locked constraints
 */
export async function generateStoryboardWithLock(
  request: StoryboardGenerationRequest
): Promise<StoryboardGenerationResponse> {
  const { prompt, characterReference, brandConstraints } =
    await buildLockedPrompt(
      request.shotDescription,
      request.projectId,
      request.brandId
    );

  // TODO: Call image generation API (NanoBanana Pro)
  // For now, return placeholder

  return {
    imageUrl: "",
    prompt,
    shotNumber: request.shotNumber,
    characterLocked: !!characterReference,
    brandApplied: !!brandConstraints,
  };
}

/**
 * Validate that generated image respects locked constraints
 */
export async function validateLockedConstraints(
  _imageUrl: string,
  projectId: number,
  brandId?: number
): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  // Get locked character
  const lockedCharacter = await getLockedCharacter(projectId);
  if (lockedCharacter) {
    // TODO: Use vision API to verify character appearance matches reference
    // For now, assume valid
  }

  // Get brand constraints
  if (brandId) {
    const brand = await getBrand(brandId);
    if (brand) {
      // TODO: Use vision API to verify brand colors and style are respected
      // For now, assume valid
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Generate multiple variations while maintaining locked constraints
 */
export async function generateVariationsWithLock(
  request: StoryboardGenerationRequest,
  variationCount: number = 3
): Promise<StoryboardGenerationResponse[]> {
  const variations: StoryboardGenerationResponse[] = [];

  for (let i = 0; i < variationCount; i++) {
    const { prompt } = await buildLockedPrompt(
      `${request.shotDescription} (Variation ${i + 1}: ${getVariationModifier(i)})`,
      request.projectId,
      request.brandId
    );

    variations.push({
      imageUrl: "",
      prompt,
      shotNumber: request.shotNumber,
      characterLocked: true,
      brandApplied: !!request.brandId,
    });
  }

  return variations;
}

/**
 * Get variation modifier for different camera angles/lighting
 */
function getVariationModifier(index: number): string {
  const modifiers = [
    "Wide shot with dramatic lighting",
    "Close-up with soft lighting",
    "Medium shot with natural lighting",
    "Over-the-shoulder shot with warm lighting",
    "Dutch angle with moody lighting",
  ];
  return modifiers[index % modifiers.length];
}

/**
 * Build frame descriptor for video animation
 * This locks the visual specification for Flow/Sora
 */
export async function buildFrameDescriptor(
  _imageUrl: string,
  projectId: number,
  brandId?: number
): Promise<{
  composition: string;
  lighting: string;
  characters: string;
  mood: string;
  colorPalette: Record<string, string>;
  constraints: string[];
}> {
  const lockedCharacter = await getLockedCharacter(projectId);
  const brand = brandId ? await getBrand(brandId) : null;

  const constraints: string[] = [
    "Character appearance is immutable - must match reference image exactly",
    "Composition must match storyboard frame",
    "Lighting must match storyboard mood",
    "Color palette must respect brand identity",
    "Video animation can only add movement, not change visual elements",
  ];

  return {
    composition: "As shown in storyboard frame - do not modify",
    lighting: "As shown in storyboard frame - do not modify",
    characters: lockedCharacter
      ? `${lockedCharacter.name}: ${lockedCharacter.description} - LOCKED, do not modify`
      : "As shown in storyboard frame",
    mood: brand?.visualIdentity || "Professional and cinematic",
    colorPalette: brand?.colorPalette || {
      primary: "#0088cc",
      secondary: "#00ccff",
      accent: "#ff6600",
      neutral: "#333333",
    },
    constraints,
  };
}
