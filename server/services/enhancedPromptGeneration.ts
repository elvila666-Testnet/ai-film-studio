/**
 * Enhanced Prompt Generation Service
 * Generates Motion Prompts and Story Intent for improved video generation
 * Integrates with Nanobanana 2.0 for consistent visual language
 */

import type { ProductionBible } from "./showrunnerService";

export interface EnhancedPromptRequest {
  shotNumber: number;
  visualDescription: string;
  emotionalObjective: string;
  cameraMovement: string;
  characterActions: string[];
  sceneContext: string;
  cinematographyNotes?: string;
  audioNotes?: string;
  style?: string;
}

export interface MotionPrompt {
  cameraMotion: string;
  characterMotion: string;
  emotionalArc: string;
  temporalPacing: string;
  combined: string;
}

export interface StoryIntent {
  narrativeFunction: string;
  emotionalBeat: string;
  visualTheme: string;
  psychologicalIntent: string;
  combined: string;
}

/**
 * Generate a detailed motion prompt from shot specifications
 * Focuses on camera and character movement with emotional context
 */
export function generateMotionPrompt(request: EnhancedPromptRequest): MotionPrompt {
  const cameraMotion = generateCameraMotion(
    request.cameraMovement,
    request.cinematographyNotes
  );

  const characterMotion = generateCharacterMotion(
    request.characterActions,
    request.emotionalObjective
  );

  const emotionalArc = generateEmotionalArc(
    request.emotionalObjective,
    request.sceneContext
  );

  const temporalPacing = generateTemporalPacing(
    request.cameraMovement,
    request.characterActions
  );

  const combined = `
MOTION SEQUENCE (Shot ${request.shotNumber}):

CAMERA MOTION:
${cameraMotion}

CHARACTER MOTION:
${characterMotion}

EMOTIONAL ARC:
${emotionalArc}

TEMPORAL PACING:
${temporalPacing}

VISUAL CONTINUITY:
- Maintain all character appearances from reference images
- Preserve lighting and color grading from base frame
- Keep composition and framing consistent
- Ensure smooth transitions between movements
`;

  return {
    cameraMotion,
    characterMotion,
    emotionalArc,
    temporalPacing,
    combined,
  };
}

/**
 * Generate story intent prompt for narrative-driven generation
 */
export function generateStoryIntent(request: EnhancedPromptRequest): StoryIntent {
  const narrativeFunction = generateNarrativeFunction(
    request.visualDescription,
    request.sceneContext
  );

  const emotionalBeat = generateEmotionalBeat(
    request.emotionalObjective,
    request.characterActions
  );

  const visualTheme = generateVisualTheme(
    request.style,
    request.cinematographyNotes
  );

  const psychologicalIntent = generatePsychologicalIntent(
    request.emotionalObjective,
    request.sceneContext
  );

  const combined = `
STORY INTENT (Shot ${request.shotNumber}):

NARRATIVE FUNCTION:
${narrativeFunction}

EMOTIONAL BEAT:
${emotionalBeat}

VISUAL THEME:
${visualTheme}

PSYCHOLOGICAL INTENT:
${psychologicalIntent}

DIRECTORIAL VISION:
- This shot serves the overall story arc
- Character emotions drive visual composition
- Every element reinforces narrative meaning
- Maintain thematic consistency throughout sequence
`;

  return {
    narrativeFunction,
    emotionalBeat,
    visualTheme,
    psychologicalIntent,
    combined,
  };
}

/**
 * Generate camera motion description
 */
function generateCameraMotion(
  cameraMovement: string,
  cinematographyNotes?: string
): string {
  const movementMap: Record<string, string> = {
    "pan": "Smooth horizontal pan revealing new information",
    "tilt": "Vertical tilt following action or emotion",
    "dolly": "Forward/backward movement creating depth and intimacy",
    "crane": "Elevated movement providing context and scale",
    "orbit": "Circular movement around subject for dynamic perspective",
    "static": "Locked camera maintaining compositional stability",
    "handheld": "Organic, subtle movement for immediacy and realism",
    "tracking": "Following subject movement with synchronized camera",
  };

  const baseMotion = movementMap[cameraMovement.toLowerCase()] || 
    `${cameraMovement} movement with intentional purpose`;

  const technicalDetails = cinematographyNotes 
    ? `\nTechnical Specification: ${cinematographyNotes}`
    : "";

  return `${baseMotion}${technicalDetails}`;
}

/**
 * Generate character motion description
 */
function generateCharacterMotion(
  characterActions: string[],
  emotionalObjective: string
): string {
  if (characterActions.length === 0) {
    return `Characters maintain current positions with subtle breathing and micro-expressions reflecting the emotional beat: ${emotionalObjective}`;
  }

  const actions = characterActions
    .map((action) => `- ${action}`)
    .join("\n");

  return `
Character Actions:
${actions}

Emotional Motivation:
- All movement stems from the emotional objective: ${emotionalObjective}
- Physical actions reinforce psychological state
- Movement pacing matches emotional intensity
- Maintain character consistency and physicality
`;
}

/**
 * Generate emotional arc description
 */
function generateEmotionalArc(
  emotionalObjective: string,
  sceneContext: string
): string {
  const emotionMap: Record<string, string> = {
    "tension": "Building intensity with escalating stakes",
    "release": "Relief and catharsis following conflict",
    "discovery": "Wonder and revelation in visual language",
    "conflict": "Internal or external struggle driving action",
    "resolution": "Acceptance and closure of narrative arc",
    "anticipation": "Suspense and forward momentum",
    "melancholy": "Introspection and emotional depth",
    "triumph": "Celebration and achievement",
    "vulnerability": "Exposure and emotional authenticity",
    "determination": "Resolve and focused intention",
  };

  const emotionDescription = Object.entries(emotionMap).find(([key]) =>
    emotionalObjective.toLowerCase().includes(key)
  )?.[1] || `Emotional journey: ${emotionalObjective}`;

  return `
Primary Emotion: ${emotionalObjective}
${emotionDescription}

Scene Context: ${sceneContext}

Visual Manifestation:
- Lighting shifts reflect emotional state
- Color palette intensifies with emotion
- Movement speed and quality express feeling
- Composition emphasizes emotional focal points
`;
}

/**
 * Generate temporal pacing description
 */
function generateTemporalPacing(
  cameraMovement: string,
  characterActions: string[]
): string {
  const hasIntenseMovement = 
    cameraMovement.toLowerCase().includes("dolly") ||
    cameraMovement.toLowerCase().includes("tracking") ||
    characterActions.some(a => a.toLowerCase().includes("run") || a.toLowerCase().includes("rush"));

  const pacing = hasIntenseMovement
    ? "Fast-paced, dynamic movement creating urgency and energy"
    : "Measured, deliberate pacing allowing emotional absorption";

  return `
Pacing Style: ${pacing}

Timing Considerations:
- Shot duration matches emotional beat
- Movement speed reinforces narrative tension
- Pauses allow character moments to land
- Transitions between movements feel organic
- Overall rhythm serves the story
`;
}

/**
 * Generate narrative function description
 */
function generateNarrativeFunction(
  visualDescription: string,
  sceneContext: string
): string {
  return `
Visual Description: ${visualDescription}

Scene Context: ${sceneContext}

Narrative Purpose:
- This shot advances the story forward
- Visual information supports plot progression
- Character actions reveal motivation
- Setting establishes context and atmosphere
- Dialogue (if present) is supported by visual language
`;
}

/**
 * Generate emotional beat description
 */
function generateEmotionalBeat(
  emotionalObjective: string,
  characterActions: string[]
): string {
  const actionSummary = characterActions.length > 0
    ? `Character actions: ${characterActions.join(", ")}`
    : "Subtle character presence and reaction";

  return `
Emotional Objective: ${emotionalObjective}

Character Expression:
${actionSummary}

Emotional Authenticity:
- Character emotions feel genuine and motivated
- Facial expressions and body language align
- Emotional beats build on previous moments
- Vulnerability and strength balance appropriately
`;
}

/**
 * Generate visual theme description
 */
function generateVisualTheme(
  style?: string,
  cinematographyNotes?: string
): string {
  const styleDescription = style || "Cinematic realism with artistic intent";
  const technicalSpec = cinematographyNotes || "Professional cinematography standards";

  return `
Visual Style: ${styleDescription}

Technical Cinematography: ${technicalSpec}

Thematic Visual Language:
- Color palette reinforces emotional tone
- Lighting design supports narrative theme
- Composition guides viewer attention
- Visual metaphors enhance storytelling
- Aesthetic consistency throughout sequence
`;
}

/**
 * Generate psychological intent description
 */
function generatePsychologicalIntent(
  emotionalObjective: string,
  sceneContext: string
): string {
  return `
Psychological Core: ${emotionalObjective}

Narrative Context: ${sceneContext}

Viewer Experience:
- Audience understands character motivation
- Visual language creates emotional resonance
- Subtext is visually communicated
- Psychological journey feels authentic
- Viewer investment in character arc deepens
`;
}

/**
 * Generate enhanced prompt combining motion and story intent for a single shot
 */
export function generateEnhancedShotPrompt(
  request: EnhancedPromptRequest
): string {
  const motionPrompt = generateMotionPrompt(request);
  const storyIntent = generateStoryIntent(request);

  return `
═══════════════════════════════════════════════════════════════
ENHANCED SHOT PROMPT - Shot ${request.shotNumber}
═══════════════════════════════════════════════════════════════

${motionPrompt.combined}

═══════════════════════════════════════════════════════════════

${storyIntent.combined}

═══════════════════════════════════════════════════════════════
INTEGRATION NOTES:
═══════════════════════════════════════════════════════════════

This prompt combines technical motion specifications with narrative intent.
The video generation should respect both the visual anchor (Nanobanana frame)
and the emotional/narrative direction specified here.

Key Principles:
1. Visual consistency: Maintain appearance from reference images
2. Emotional authenticity: Character emotions drive movement
3. Narrative clarity: Every action serves the story
4. Technical excellence: Professional cinematography standards
5. Temporal coherence: Pacing matches emotional beats

═══════════════════════════════════════════════════════════════
`;
}

/**
 * Generate enhanced prompts for a full sequence of shots
 */
export function generateEnhancedSequencePrompts(
  shots: EnhancedPromptRequest[]
): string[] {
  return shots.map((shot) => generateEnhancedShotPrompt(shot));
}

/**
 * Extract motion and story intent from production bible
 */
export function extractEnhancedPromptsFromBible(
  bible: ProductionBible,
  sceneIndex: number
): EnhancedPromptRequest[] {
  const scene = bible.technicalScript[sceneIndex];
  if (!scene) return [];

  return scene.shots.map((shot, shotIdx) => ({
    shotNumber: (sceneIndex * 100) + shotIdx + 1,
    visualDescription: shot.visualDescription,
    emotionalObjective: (shot as any).intencion || "Neutral",
    cameraMovement: (shot as any).movimiento || "Static",
    characterActions: [], // Would be extracted from shot.accion
    sceneContext: scene.title,
    cinematographyNotes: (shot as any).tecnica,
    audioNotes: shot.audioDescription,
    style: bible.visualStyle?.style,
  }));
}
