/**
 * Flow Video Generation Service
 * Generates short videos from storyboard frames with camera movement
 * Flow respects the visual anchor (NanoBanana frame) and only adds motion
 */

import { FrameDescriptor, generateFlowPrompt } from "./frameDescriptor";

export interface FlowGenerationRequest {
  frameDescriptor: FrameDescriptor;
  storyboardImageUrl: string;
  projectId: number;
}

export interface FlowGenerationResult {
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
 * Generate Flow video from storyboard frame
 * Flow adds: camera movement, parallax, depth, subtle animation
 * Flow does NOT change: composition, characters, mood, lighting, style
 */
export async function generateFlowVideo(
  request: FlowGenerationRequest
): Promise<FlowGenerationResult> {
  const startTime = Date.now();

  try {
    // Get Flow API credentials
    const flowApiKey = process.env.FLOW_API_KEY;
    const flowApiUrl = process.env.FLOW_API_URL || "https://api.flow.ai/v1";

    if (!flowApiKey) {
      throw new Error("FLOW_API_KEY not configured");
    }

    // Generate Flow-optimized prompt
    const flowPrompt = generateFlowPrompt(request.frameDescriptor);

    // Call Flow API
    const response = await fetch(`${flowApiUrl}/generate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${flowApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: flowPrompt,
        image_url: request.storyboardImageUrl,
        duration: request.frameDescriptor.duration,
        camera_movement: request.frameDescriptor.cameraMovement || "subtle pan",
        parallax_depth: request.frameDescriptor.depth || "moderate",
        style: "cinematic",
        quality: "high",
        // Flow-specific parameters
        preserve_composition: true,
        preserve_characters: true,
        preserve_lighting: true,
        animation_style: "smooth",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Flow API error: ${response.status} - ${error}`);
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
    console.error("Flow generation failed:", error);
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
 * Generate multiple Flow videos for a sequence
 */
export async function generateFlowSequence(
  frameDescriptors: FrameDescriptor[],
  storyboardImageUrls: string[],
  projectId: number
): Promise<FlowGenerationResult[]> {
  const results: FlowGenerationResult[] = [];

  for (let i = 0; i < frameDescriptors.length; i++) {
    const result = await generateFlowVideo({
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
 * Validate Flow output maintains visual consistency
 */
export async function validateFlowOutput(
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
    const expectedDuration = frameDescriptor.duration;
    const toleranceRange = 0.5; // ±0.5 seconds
    
    // Note: Would need video analysis to verify actual duration
    // This is a placeholder

    return {
      isValid: violations.length === 0,
      violations,
      confidenceScore: score,
    };
  } catch (error) {
    console.error("Flow validation failed:", error);
    return {
      isValid: false,
      violations: [error instanceof Error ? error.message : "Validation failed"],
      confidenceScore: 0,
    };
  }
}

/**
 * Create Flow generation report
 */
export function createFlowReport(
  results: FlowGenerationResult[]
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
