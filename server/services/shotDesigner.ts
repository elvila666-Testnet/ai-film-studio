/**
 * Shot Designer Service
 * Enables 4K rendering and multi-moment generation for advanced cinematography
 * Integrates with Nanobanana 2.0 for premium visual output
 */

import { GeminiProvider } from "./providers/geminiProvider";
import { generateEnhancedShotPrompt, EnhancedPromptRequest } from "./enhancedPromptGeneration";
import type { ImageGenerationParams } from "./providers/types";
import { ensurePermanentUrl } from "./aiGeneration";

export interface ShotDesignRequest {
  projectId: number;
  shotNumber: number;
  basePrompt: string;
  characterReferences: Record<string, string>; // Character name -> image URL
  setReferences: Record<string, string>; // Set name -> image URL
  resolution: "1080p" | "2k" | "4k";
  moments: ShotMoment[];
  cinematographyStyle?: string;
  visualStyle?: string;
}

export interface ShotMoment {
  momentNumber: number;
  description: string;
  duration: number; // in seconds
  emotionalBeat?: string;
  cameraMovement?: string;
}

export interface ShotDesignResult {
  shotNumber: number;
  resolution: string;
  moments: GeneratedMoment[];
  totalDuration: number;
  status: "success" | "partial" | "failed";
  error?: string;
}

export interface GeneratedMoment {
  momentNumber: number;
  imageUrl: string;
  prompt: string;
  duration: number;
  processingTime: number;
}

/**
 * Generate a single 4K shot with multiple moments
 */
export async function generateShotDesign(
  request: ShotDesignRequest
): Promise<ShotDesignResult> {
  const geminiProvider = new GeminiProvider();
  const moments: GeneratedMoment[] = [];
  const resolutionMap = {
    "1080p": { width: 1920, height: 1080 },
    "2k": { width: 2560, height: 1440 },
    "4k": { width: 3840, height: 2160 },
  };

  const resolution = resolutionMap[request.resolution] || resolutionMap["4k"];

  try {
    // Generate all moments in parallel for speed
    const momentPromises = request.moments.map(async (moment) => {
      try {
        const prompt = buildShotMomentPrompt(
          request.basePrompt,
          moment,
          request.characterReferences,
          request.setReferences,
          request.cinematographyStyle,
          request.visualStyle
        );

        // Generate image for this moment
        const params: ImageGenerationParams = {
          prompt,
          resolution: `${resolution.width}x${resolution.height}` as ImageGenerationParams["resolution"],
          quality: "hd",
          count: 1,
          style: request.visualStyle || "cinematic",
          imageInputs: Object.values(request.characterReferences).concat(
            Object.values(request.setReferences)
          ),
        };

        const result = await geminiProvider.generateImage(params);
        const permanentUrl = await ensurePermanentUrl(result.url, "shot-designer");

        console.log(
          `[ShotDesigner] Generated moment ${moment.momentNumber} for shot ${request.shotNumber}: ${permanentUrl.substring(0, 30)}...`
        );

        return {
          momentNumber: moment.momentNumber,
          imageUrl: permanentUrl,
          prompt,
          duration: moment.duration,
          processingTime: result.processingTime,
        } as GeneratedMoment;
      } catch (momentError) {
        console.error(
          `[ShotDesigner] Failed to generate moment ${moment.momentNumber}:`,
          momentError
        );
        return null;
      }
    });

    const results = await Promise.all(momentPromises);
    
    // Filter out failed moments and add to the list
    results.forEach(m => {
      if (m) moments.push(m);
    });

    const totalDuration = moments.reduce((sum, m) => sum + m.duration, 0);
    const status = moments.length === request.moments.length ? "success" : "partial";

    return {
      shotNumber: request.shotNumber,
      resolution: request.resolution,
      moments,
      totalDuration,
      status,
    };
  } catch (error) {
    console.error("[ShotDesigner] Shot design generation failed:", error);
    return {
      shotNumber: request.shotNumber,
      resolution: request.resolution,
      moments: [],
      totalDuration: 0,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate multiple shots in sequence
 */
export async function generateSequenceDesign(
  requests: ShotDesignRequest[]
): Promise<ShotDesignResult[]> {
  const results: ShotDesignResult[] = [];

  for (const request of requests) {
    const result = await generateShotDesign(request);
    results.push(result);
  }

  return results;
}

/**
 * Build prompt for a specific moment within a shot
 */
function buildShotMomentPrompt(
  basePrompt: string,
  moment: ShotMoment,
  characterReferences: Record<string, string>,
  setReferences: Record<string, string>,
  cinematographyStyle?: string,
  visualStyle?: string
): string {
  const enhancedPromptRequest: EnhancedPromptRequest = {
    shotNumber: moment.momentNumber,
    visualDescription: `${basePrompt}. Moment: ${moment.description}`,
    emotionalObjective: moment.emotionalBeat || "Neutral",
    cameraMovement: moment.cameraMovement || "Static",
    characterActions: [], // This would ideally come from a more detailed shot breakdown
    sceneContext: `Shot ${moment.momentNumber} within a multi-moment sequence.`,
    cinematographyNotes: cinematographyStyle,
    audioNotes: undefined, // Not directly used in image generation prompt
    style: visualStyle,
  };

  const enhancedPrompt = generateEnhancedShotPrompt(enhancedPromptRequest);

  const characterAnchors = Object.entries(characterReferences)
    .map(([name, url]) => `- ${name}: [Reference: ${url}]`)
    .join("\n");

  const setAnchors = Object.entries(setReferences)
    .map(([name, url]) => `- ${name}: [Reference: ${url}]`)
    .join("\n");

  return `
═══════════════════════════════════════════════════════════════
SHOT DESIGNER - 4K MULTI-MOMENT GENERATION
═══════════════════════════════════════════════════════════════

${enhancedPrompt}

DURATION: ${moment.duration} seconds

CHARACTER VISUAL ANCHORS (MAINTAIN CONSISTENCY):
${characterAnchors || "No character references"}

SET VISUAL ANCHORS (MAINTAIN CONSISTENCY):
${setAnchors || "No set references"}

CRITICAL REQUIREMENTS:
1. Maintain exact character appearance from reference images
2. Preserve set design and architecture from reference images
3. Ensure smooth visual continuity between moments
4. Apply professional color grading and lighting
5. Generate at maximum quality and detail
6. Respect all visual anchors provided

═══════════════════════════════════════════════════════════════
`;
}

/**
 * Estimate processing time for 4K shot generation
 */
export function estimateProcessingTime(
  momentCount: number,
  resolution: "1080p" | "2k" | "4k"
): number {
  const baseTime = 30; // seconds per moment
  const resolutionMultiplier = {
    "1080p": 1,
    "2k": 1.5,
    "4k": 2.5,
  };

  return Math.ceil(baseTime * momentCount * resolutionMultiplier[resolution]);
}

/**
 * Validate shot design request
 */
export function validateShotDesignRequest(
  request: ShotDesignRequest
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.basePrompt || request.basePrompt.trim().length === 0) {
    errors.push("Base prompt is required");
  }

  if (!request.moments || request.moments.length === 0) {
    errors.push("At least one moment is required");
  }

  for (const moment of request.moments || []) {
    if (!moment.description || moment.description.trim().length === 0) {
      errors.push(`Moment ${moment.momentNumber} requires a description`);
    }
    if (moment.duration <= 0) {
      errors.push(`Moment ${moment.momentNumber} duration must be positive`);
    }
  }

  if (!["1080p", "2k", "4k"].includes(request.resolution)) {
    errors.push("Resolution must be 1080p, 2k, or 4k");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate shot designer prompt for UI display
 */
export function generateShotDesignerUI(request: ShotDesignRequest): string {
  const momentsList = request.moments
    .map(
      (m) =>
        `Moment ${m.momentNumber}: ${m.description} (${m.duration}s)${
          m.emotionalBeat ? ` - ${m.emotionalBeat}` : ""
        }`
    )
    .join("\n");

  return `
SHOT DESIGNER - MULTI-MOMENT GENERATION

Shot Number: ${request.shotNumber}
Resolution: ${request.resolution}
Total Moments: ${request.moments.length}

MOMENTS:
${momentsList}

VISUAL REFERENCES:
Characters: ${Object.keys(request.characterReferences).join(", ") || "None"}
Sets: ${Object.keys(request.setReferences).join(", ") || "None"}

ESTIMATED PROCESSING TIME:
${estimateProcessingTime(request.moments.length, request.resolution)} seconds

This will generate ${request.moments.length} high-quality 4K frames
maintaining visual consistency across all moments.
`;
}
