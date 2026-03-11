/**
 * Character Lock Service
 * Ensures character consistency across all storyboard shots
 */

export interface CharacterLockConfig {
  characterId: number;
  characterImageUrl: string;
  characterDescription: string;
  productReferenceUrl?: string;
  brandColorPalette?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface LockedGenerationPrompt {
  basePrompt: string;
  characterReference: string;
  productReference?: string;
  styleGuidelines: string;
  fullPrompt: string;
}

/**
 * Build a locked generation prompt that maintains character and product consistency
 */
export function buildLockedPrompt(
  basePrompt: string,
  lockConfig: CharacterLockConfig
): LockedGenerationPrompt {
  const characterReference = `
CRITICAL - HARD CHARACTER LOCK (MANDATORY):
- Use exact face reconstruction from the locked character reference image: ${lockConfig.characterImageUrl}
- Character Identity: ${lockConfig.characterDescription}
- Do not alter facial structure.
- Identity weight priority over: Lighting, Cinematic style, Dramatic composition, Lens distortion.
- If conflict occurs → preserve face accuracy.

MANDATORY CHARACTER SPECS:
- Reconstruct exact facial geometry from the reference:
  - Same eye distance
  - Same nose width
  - Same mustache density and length (if applicable)
  - Same hairline
  - Same ear shape
  - Same jawline
  - Same skin tone
  - Same eyebrow thickness
  - Same cheekbone structure
- Same clothing/uniform proportions as reference
- Same accessories layout
- Same collar structure
- Same shoulder width
- No stylization. No beautification. No reinterpretation.
- No character reinterpretation
- No facial variation
- No hairstyle change
- No body proportion shift
`;

  const productReference = lockConfig.productReferenceUrl
    ? `
PRODUCT REFERENCE:
- Include this product in the shot: ${lockConfig.productReferenceUrl}
- Maintain consistent product appearance and positioning
`
    : "";

  const styleGuidelines = `
STYLE CONSISTENCY:
- Maintain consistent lighting and color grading
- Use brand colors: Primary ${lockConfig.brandColorPalette?.primary || "not specified"}
- Keep visual language consistent with brand identity
- Maintain same camera perspective and composition style
`;

  const fullPrompt = `
${basePrompt}

${characterReference}
${productReference}
${styleGuidelines}

GENERATION RULES:
1. Character must be IDENTICAL to reference image (HARD IDENTITY LOCK)
2. Product must be IDENTICAL to reference image
3. Do not create variations or alternative interpretations of facial features
4. Maintain exact consistency with previous shots
5. Use reference images as strict visual anchors
`;

  return {
    basePrompt,
    characterReference,
    productReference: lockConfig.productReferenceUrl,
    styleGuidelines,
    fullPrompt: fullPrompt.trim(),
  };
}

/**
 * Validate that generated image matches character lock requirements
 */
export function validateCharacterLock(
  _generatedImageUrl: string,
  _lockConfig: CharacterLockConfig
): {
  isValid: boolean;
  issues: string[];
} {
  // This would use vision AI to compare the generated image with the reference
  // For now, return a placeholder validation
  return {
    isValid: true,
    issues: [],
  };
}

/**
 * Create image-to-video motion prompt that respects character lock
 */
export function buildMotionPrompt(
  baseMotionDescription: string,
  _lockConfig: CharacterLockConfig
): string {
  return `
START FRAME: Reference the locked character image exactly as provided
CHARACTER CONSTRAINT: Keep character appearance IDENTICAL throughout the motion
MOTION: ${baseMotionDescription}

CRITICAL RULES:
- Character must not change appearance during motion
- Facial features must remain consistent
- Clothing and styling must not change
- Only animate movement, not appearance changes
- Maintain brand visual identity throughout
`;
}
