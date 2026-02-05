/**
 * Frame Descriptor Service
 * Converts NanoBanana storyboard frames into visual anchors for Flow/Sora
 * Ensures strict visual hierarchy: NanoBanana decides look, Flow/Sora animates it
 */

export interface FrameDescriptor {
  // Visual identity (locked for Flow/Sora)
  composition: string;
  cameraLanguage: string;
  mood: string;
  lighting: string;
  colorPalette: string;
  visualStyle: string;
  
  // Character consistency (locked)
  characters: Record<string, string>;
  characterPositions: Record<string, string>;
  
  // Camera instructions (for Flow)
  cameraMovement?: string;
  depth?: string;
  parallax?: string;
  
  // Acting instructions (for Sora)
  actingDirection?: string;
  emotionalBeat?: string;
  temporalContinuity?: string;
  
  // Metadata
  shotNumber: number;
  duration: number;
  narrativeContext: string;
}

/**
 * Extract frame descriptor from storyboard image and metadata
 */
export function createFrameDescriptor(
  shotNumber: number,
  imagePrompt: string,
  technicalShot: {
    tipo_plano: string;
    accion: string;
    intencion: string;
  },
  characters: Record<string, string>,
  visualStyle: string,
  narrativeContext: string
): FrameDescriptor {
  // Parse the image prompt to extract visual elements
  const composition = extractComposition(imagePrompt, technicalShot.tipo_plano);
  const cameraLanguage = extractCameraLanguage(technicalShot.tipo_plano);
  const mood = extractMood(imagePrompt, technicalShot.intencion);
  const lighting = extractLighting(imagePrompt);
  const colorPalette = extractColorPalette(imagePrompt, visualStyle);

  return {
    composition,
    cameraLanguage,
    mood,
    lighting,
    colorPalette,
    visualStyle,
    characters,
    characterPositions: extractCharacterPositions(imagePrompt),
    shotNumber,
    duration: estimateShotDuration(technicalShot.tipo_plano),
    narrativeContext,
  };
}

/**
 * Generate Flow-optimized prompt from frame descriptor
 * Flow needs: base frame + camera movement instructions
 */
export function generateFlowPrompt(descriptor: FrameDescriptor): string {
  const basePrompt = `
Base Frame (LOCKED - do not change):
- Composition: ${descriptor.composition}
- Camera Language: ${descriptor.cameraLanguage}
- Mood: ${descriptor.mood}
- Lighting: ${descriptor.lighting}
- Color Palette: ${descriptor.colorPalette}
- Visual Style: ${descriptor.visualStyle}

Characters (LOCKED - maintain exact appearance):
${Object.entries(descriptor.characters)
  .map(([name, desc]) => `- ${name}: ${desc}`)
  .join("\n")}

Character Positions (LOCKED):
${Object.entries(descriptor.characterPositions)
  .map(([name, pos]) => `- ${name}: ${pos}`)
  .join("\n")}

FLOW INSTRUCTIONS (animate only):
- Apply subtle camera movement
- Add parallax depth
- Maintain all visual elements from base frame
- Do not change character appearance or position
- Duration: ${descriptor.duration}s
- Context: ${descriptor.narrativeContext}

Output: Smooth camera movement that reveals the scene without breaking visual continuity.
`;

  return basePrompt;
}

/**
 * Generate Sora-optimized prompt from frame descriptor
 * Sora needs: keyframe + acting/emotional direction
 */
export function generateSoraPrompt(descriptor: FrameDescriptor): string {
  const basePrompt = `
Keyframe (LOCKED - visual anchor):
- Composition: ${descriptor.composition}
- Camera Language: ${descriptor.cameraLanguage}
- Mood: ${descriptor.mood}
- Lighting: ${descriptor.lighting}
- Color Palette: ${descriptor.colorPalette}
- Visual Style: ${descriptor.visualStyle}

Characters (LOCKED - exact appearance and consistency):
${Object.entries(descriptor.characters)
  .map(([name, desc]) => `- ${name}: ${desc}`)
  .join("\n")}

Initial Positions (LOCKED):
${Object.entries(descriptor.characterPositions)
  .map(([name, pos]) => `- ${name}: ${pos}`)
  .join("\n")}

SORA INSTRUCTIONS (animate within frame):
- Acting Direction: ${descriptor.actingDirection || "Natural, motivated by narrative"}
- Emotional Beat: ${descriptor.emotionalBeat || "Neutral"}
- Temporal Continuity: ${descriptor.temporalContinuity || "Seamless"}
- Duration: ${descriptor.duration}s
- Narrative Context: ${descriptor.narrativeContext}

CRITICAL RULES:
1. Do not change character appearance
2. Do not break camera framing
3. Do not alter visual style
4. Maintain lighting consistency
5. Keep color palette intact

Output: Organic character movement and acting that stays within the visual frame defined above.
`;

  return basePrompt;
}

/**
 * Validate frame consistency between storyboard and generated video
 */
export function validateFrameConsistency(
  frameDescriptor: FrameDescriptor,
  generatedVideoMetadata: {
    detectedComposition: string;
    detectedCharacters: string[];
    detectedMood: string;
    detectedLighting: string;
  }
): {
  isConsistent: boolean;
  violations: string[];
  confidenceScore: number;
} {
  const violations: string[] = [];
  let matchScore = 0;

  // Check composition consistency
  if (!generatedVideoMetadata.detectedComposition.includes(frameDescriptor.composition.split(" ")[0])) {
    violations.push("Composition changed from frame descriptor");
  } else {
    matchScore += 25;
  }

  // Check character consistency
  const expectedCharacters = Object.keys(frameDescriptor.characters);
  const detectedCharacters = generatedVideoMetadata.detectedCharacters;
  
  if (expectedCharacters.length !== detectedCharacters.length) {
    violations.push(`Character count mismatch: expected ${expectedCharacters.length}, got ${detectedCharacters.length}`);
  } else {
    matchScore += 25;
  }

  // Check mood consistency
  if (!generatedVideoMetadata.detectedMood.toLowerCase().includes(frameDescriptor.mood.toLowerCase().split(" ")[0])) {
    violations.push("Mood/tone changed from frame descriptor");
  } else {
    matchScore += 25;
  }

  // Check lighting consistency
  if (!generatedVideoMetadata.detectedLighting.includes(frameDescriptor.lighting.split(" ")[0])) {
    violations.push("Lighting changed from frame descriptor");
  } else {
    matchScore += 25;
  }

  return {
    isConsistent: violations.length === 0,
    violations,
    confidenceScore: matchScore,
  };
}

/**
 * Helper functions to extract visual elements from prompts
 */

function extractComposition(prompt: string, shotType: string): string {
  const compositionPatterns: Record<string, string> = {
    "plano general": "Wide establishing shot with clear spatial relationships",
    "plano medio": "Medium shot framing characters from waist up",
    "primer plano": "Close-up focusing on facial expressions",
    "plano americano": "Full body shot with space above head",
    "plano detalle": "Extreme close-up of specific object or detail",
  };

  return compositionPatterns[shotType.toLowerCase()] || "Balanced composition with clear focal point";
}

function extractCameraLanguage(shotType: string): string {
  const cameraLanguage: Record<string, string> = {
    "plano general": "Establishing, objective perspective",
    "plano medio": "Conversational, intimate perspective",
    "primer plano": "Emotional intensity, subjective focus",
    "plano americano": "Action-oriented, full body visibility",
    "plano detalle": "Symbolic, detail-focused narrative",
  };

  return cameraLanguage[shotType.toLowerCase()] || "Neutral, observational";
}

function extractMood(prompt: string, intention: string): string {
  const moodKeywords: Record<string, string> = {
    dramatic: "Intense, high-stakes emotional atmosphere",
    comedic: "Light, playful, humorous tone",
    romantic: "Warm, intimate, tender atmosphere",
    suspenseful: "Tense, mysterious, anticipatory mood",
    melancholic: "Sad, reflective, introspective tone",
    triumphant: "Victorious, celebratory, powerful mood",
  };

  for (const [key, mood] of Object.entries(moodKeywords)) {
    if (intention.toLowerCase().includes(key)) {
      return mood;
    }
  }

  return "Neutral, narrative-driven mood";
}

function extractLighting(prompt: string): string {
  if (prompt.toLowerCase().includes("dark") || prompt.toLowerCase().includes("night")) {
    return "Low-key, dramatic shadows, high contrast";
  }
  if (prompt.toLowerCase().includes("bright") || prompt.toLowerCase().includes("day")) {
    return "High-key, natural sunlight, soft shadows";
  }
  if (prompt.toLowerCase().includes("golden") || prompt.toLowerCase().includes("sunset")) {
    return "Warm golden hour, directional side lighting";
  }
  return "Balanced three-point lighting, naturalistic";
}

function extractColorPalette(prompt: string, visualStyle: string): string {
  const colorPatterns: Record<string, string> = {
    noir: "Black, white, deep grays, high contrast",
    cinematic: "Warm oranges, cool blues, desaturated",
    vibrant: "Saturated colors, high contrast, bold hues",
    pastel: "Soft, muted tones, low saturation",
    monochrome: "Single color family, various tones",
  };

  for (const [style, palette] of Object.entries(colorPatterns)) {
    if (visualStyle.toLowerCase().includes(style)) {
      return palette;
    }
  }

  return "Natural color palette, cinema-accurate";
}

function extractCharacterPositions(prompt: string): Record<string, string> {
  const positions: Record<string, string> = {};
  
  // Simple pattern matching for character positions
  const positionPatterns = [
    /(\w+)\s+(?:stands|sits|lies|kneels)\s+(?:at|in|on|near)\s+(?:the\s+)?(\w+)/gi,
    /(\w+)\s+(?:is|are)\s+(?:at|in|on|near)\s+(?:the\s+)?(\w+)/gi,
  ];

  for (const pattern of positionPatterns) {
    let match;
    while ((match = pattern.exec(prompt)) !== null) {
      positions[match[1]] = `${match[2]} area`;
    }
  }

  return Object.keys(positions).length > 0 ? positions : { "primary": "center frame" };
}

function estimateShotDuration(shotType: string): number {
  const durations: Record<string, number> = {
    "plano general": 3,
    "plano medio": 2,
    "primer plano": 2.5,
    "plano americano": 2,
    "plano detalle": 1.5,
  };

  return durations[shotType.toLowerCase()] || 2.5;
}

/**
 * Create visual consistency report
 */
export function createConsistencyReport(
  frameDescriptor: FrameDescriptor,
  flowOutput?: any,
  soraOutput?: any
): {
  frameDescriptor: FrameDescriptor;
  flowConsistency?: any;
  soraConsistency?: any;
  recommendation: string;
} {
  let recommendation = "Both outputs maintain visual consistency with frame descriptor.";

  if (flowOutput && !flowOutput.isConsistent) {
    recommendation = `Flow output has violations: ${flowOutput.violations.join(", ")}`;
  }

  if (soraOutput && !soraOutput.isConsistent) {
    recommendation = `Sora output has violations: ${soraOutput.violations.join(", ")}`;
  }

  return {
    frameDescriptor,
    flowConsistency: flowOutput,
    soraConsistency: soraOutput,
    recommendation,
  };
}
