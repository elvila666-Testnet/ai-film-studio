import { ENV } from "../_core/env";

interface VideoGenerationRequest {
  prompt: string;
  duration?: number;
  quality?: "low" | "medium" | "high";
}

interface VideoGenerationResponse {
  taskId: string;
  status: string;
  videoUrl?: string;
  error?: string;
}

/**
 * Generate video using Replicate (supporting various models like Minimax, Sora, Veo)
 */
export async function generateVideoWithReplicate(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  const { getActiveModelConfig } = await import("../db");
  const activeConfig = await getActiveModelConfig("video");
  const { ReplicateProvider } = await import("./providers/replicateProvider");

  const provider = new ReplicateProvider(activeConfig?.apiKey || ENV.replicateApiKey);
  const modelId = activeConfig?.modelId || "minimax/video-01"; // Default to Minimax

  try {
    const result = await provider.generateVideo({
      prompt: request.prompt,
      duration: request.duration || 10,
      resolution: "1080p",
      fps: 24
    }, modelId);

    return {
      taskId: result.metadata.jobId as string || result.metadata.id as string || "repl-" + Date.now(),
      status: "completed",
      videoUrl: result.url,
    };
  } catch (error) {
    console.error("Replicate video generation error:", error);
    return {
      taskId: "",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check video generation status
 */
export async function checkVideoStatus(_provider: string, taskId: string): Promise<VideoGenerationResponse> {
  // Phase 4: Replicate status check (placeholder for now as ReplicateProvider.generateVideo is sync in our wrapper)
  return {
    taskId,
    status: "completed",
    videoUrl: "", // Should be fetched from DB or Replicate if needed
  };
}

/**
 * Generate video from storyboard shots using the active model from DB
 */
export async function generateVideoFromStoryboard(
  shots: Array<{ shotNumber: number; prompt: string; imageUrl?: string }>,
  _providerOverride?: "sora" | "veo3"
): Promise<VideoGenerationResponse> {
  // Combine all shot prompts into a single video prompt
  const combinedPrompt = shots
    .map((shot) => `Shot ${shot.shotNumber}: ${shot.prompt}`)
    .join("\n");

  const fullPrompt = `Create a cinematic video sequence from these storyboard shots:\n${combinedPrompt}\n\nMaintain visual continuity and smooth transitions between shots.`;

  const request: VideoGenerationRequest = {
    prompt: fullPrompt,
    duration: Math.min(shots.length * 3, 60),
    quality: "high",
  };

  return generateVideoWithReplicate(request);
}

