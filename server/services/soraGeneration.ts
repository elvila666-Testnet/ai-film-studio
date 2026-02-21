/**
 * Sora Video Generation Service
 * Generates full scene videos from storyboard frames with character acting
 * Sora respects the visual anchor (NanoBanana frame) and only adds organic motion
 */

import { FrameDescriptor, generateSoraPrompt } from "./frameDescriptor";

export interface SoraGenerationRequest {
  frameDescriptor: FrameDescriptor;
  storyboardImageUrl: string;
  projectId: number;
  sceneContext?: string;
}

export interface SoraGenerationResult {
  videoUrl: string;
  duration: number;
  status: "success" | "failed";
  error?: string;
  metadata: {
    frameDescriptor: FrameDescriptor;
    generatedAt: string;
    processingTime: number;
  };
}

/**
 * Generate Sora video from storyboard frame
 * Sora adds: character acting, organic movement, emotional beats
 * Sora does NOT change: composition, characters, mood, lighting, style
 */
export async function generateSoraVideo(
  request: SoraGenerationRequest
): Promise<SoraGenerationResult> {
  const startTime = Date.now();

  try {
    // Get Sora API credentials
    const soraApiKey = process.env.SORA_API_KEY;
    const soraApiUrl = process.env.SORA_API_URL || "https://api.sora.ai/v1";

    if (!soraApiKey) {
      throw new Error("SORA_API_KEY not configured");
    }

    // Generate Sora-optimized prompt
    const soraPrompt = generateSoraPrompt(request.frameDescriptor);

    // Call Sora API
    const response = await fetch(`${soraApiUrl}/generate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${soraApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: soraPrompt,
        image_url: request.storyboardImageUrl,
        duration: request.frameDescriptor.duration,
        acting_direction: request.frameDescriptor.actingDirection || "Natural",
        emotional_beat: request.frameDescriptor.emotionalBeat || "Neutral",
        temporal_continuity: request.frameDescriptor.temporalContinuity || "Seamless",
        style: "cinematic",
        quality: "high",
        // Sora-specific parameters
        preserve_keyframe: true,
        preserve_characters: true,
        preserve_lighting: true,
        preserve_composition: true,
        animation_style: "organic",
        character_consistency: "strict",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sora API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      videoUrl: data.video_url,
      duration: request.frameDescriptor.duration,
      status: "success",
      metadata: {
        frameDescriptor: request.frameDescriptor,
        generatedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    console.error("Sora generation failed:", error);
    return {
      videoUrl: "",
      duration: 0,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      metadata: {
        frameDescriptor: request.frameDescriptor,
        generatedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      },
    };
  }
}

/**
 * Generate multiple Sora videos for a sequence
 */
export async function generateSoraSequence(
  frameDescriptors: FrameDescriptor[],
  storyboardImageUrls: string[],
  projectId: number
): Promise<SoraGenerationResult[]> {
  const results: SoraGenerationResult[] = [];

  for (let i = 0; i < frameDescriptors.length; i++) {
    const result = await generateSoraVideo({
      frameDescriptor: frameDescriptors[i],
      storyboardImageUrl: storyboardImageUrls[i],
      projectId,
    });
    results.push(result);

    // Add small delay to avoid rate limiting
    if (i < frameDescriptors.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Validate Sora output maintains visual consistency
 */
export async function validateSoraOutput(
  videoUrl: string,
  frameDescriptor: FrameDescriptor
): Promise<{
  isValid: boolean;
  violations: string[];
  confidenceScore: number;
}> {
  try {
    // In a real implementation, this would analyze the video
    // For now, return a placeholder validation
    const violations: string[] = [];
    let score = 100;

    // Check if video exists and is accessible
    const response = await fetch(videoUrl, { method: "HEAD" });
    if (!response.ok) {
      violations.push("Video URL is not accessible");
      score -= 50;
    }

    // Check video duration is within acceptable range
    const _expectedDuration = frameDescriptor.duration;
    const _toleranceRange = 1; // ±1 second for longer scenes
    void _expectedDuration;
    void _toleranceRange;

    // Note: Would need video analysis to verify actual duration
    // This is a placeholder

    return {
      isValid: violations.length === 0,
      violations,
      confidenceScore: score,
    };
  } catch (error) {
    console.error("Sora validation failed:", error);
    return {
      isValid: false,
      violations: [error instanceof Error ? error.message : "Validation failed"],
      confidenceScore: 0,
    };
  }
}

/**
 * Create Sora generation report
 */
export function createSoraReport(
  results: SoraGenerationResult[]
): {
  totalFrames: number;
  successCount: number;
  failureCount: number;
  averageProcessingTime: number;
  videos: Array<{
    shotNumber: number;
    status: string;
    videoUrl: string;
    duration: number;
  }>;
} {
  const successCount = results.filter(r => r.status === "success").length;
  const failureCount = results.filter(r => r.status === "failed").length;
  const totalProcessingTime = results.reduce((sum, r) => sum + r.metadata.processingTime, 0);

  return {
    totalFrames: results.length,
    successCount,
    failureCount,
    averageProcessingTime: totalProcessingTime / results.length,
    videos: results.map(r => ({
      shotNumber: r.metadata.frameDescriptor.shotNumber,
      status: r.status,
      videoUrl: r.videoUrl,
      duration: r.duration,
    })),
  };
}

/**
 * Compare Flow and Sora outputs for the same frame
 */
export function compareFlowAndSora(
  _flowResult: unknown,
  _soraResult: unknown,
  frameDescriptor: FrameDescriptor
): {
  recommendation: "flow" | "sora" | "both" | "neither";
  reasoning: string;
  flowScore: number;
  soraScore: number;
} {
  let flowScore = 0;
  let soraScore = 0;
  let reasoning = "";

  // Evaluate based on shot type
  if (frameDescriptor.cameraLanguage.includes("movement")) {
    flowScore += 30;
    reasoning += "Flow excels at camera movement. ";
  }

  if (frameDescriptor.actingDirection) {
    soraScore += 30;
    reasoning += "Sora excels at character acting. ";
  }

  // Evaluate based on duration
  if (frameDescriptor.duration < 2) {
    flowScore += 20;
    reasoning += "Flow is better for quick cuts. ";
  } else {
    soraScore += 20;
    reasoning += "Sora is better for longer scenes. ";
  }

  // Evaluate based on narrative context
  if (frameDescriptor.narrativeContext.includes("action")) {
    flowScore += 25;
    reasoning += "Flow handles action sequences well. ";
  } else if (frameDescriptor.narrativeContext.includes("dialogue")) {
    soraScore += 25;
    reasoning += "Sora handles dialogue scenes well. ";
  }

  let recommendation: "flow" | "sora" | "both" | "neither" = "both";
  if (flowScore > soraScore + 20) {
    recommendation = "flow";
  } else if (soraScore > flowScore + 20) {
    recommendation = "sora";
  }

  return {
    recommendation,
    reasoning,
    flowScore,
    soraScore,
  };
}
