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
 * Generate video using Sora 2 API
 */
export async function generateVideoWithSora(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  try {
    const response = await fetch("https://api.sora.ai/v1/videos/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ENV.soraApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: request.prompt,
        duration: request.duration || 10,
        quality: request.quality || "medium",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Sora API error:", error);
      return {
        taskId: "",
        status: "failed",
        error: error.message || "Failed to generate video with Sora",
      };
    }

    const data = await response.json();
    return {
      taskId: data.id,
      status: "processing",
      videoUrl: data.video_url,
    };
  } catch (error) {
    console.error("Sora video generation error:", error);
    return {
      taskId: "",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate video using Veo3 API
 */
export async function generateVideoWithVeo3(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/veo-3:generateVideo", {
      method: "POST",
      headers: {
        "x-goog-api-key": ENV.veo3ApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: request.prompt,
        duration: request.duration || 10,
        quality: request.quality || "medium",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Veo3 API error:", error);
      return {
        taskId: "",
        status: "failed",
        error: error.error?.message || "Failed to generate video with Veo3",
      };
    }

    const data = await response.json();
    return {
      taskId: data.name || data.id,
      status: "processing",
      videoUrl: data.video_url,
    };
  } catch (error) {
    console.error("Veo3 video generation error:", error);
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
export async function checkVideoStatus(provider: "sora" | "veo3", taskId: string): Promise<VideoGenerationResponse> {
  try {
    if (provider === "sora") {
      const response = await fetch(`https://api.sora.ai/v1/videos/generations/${taskId}`, {
        headers: {
          "Authorization": `Bearer ${ENV.soraApiKey}`,
        },
      });

      if (!response.ok) {
        return { taskId, status: "failed", error: "Failed to check Sora video status" };
      }

      const data = await response.json();
      return {
        taskId,
        status: data.status,
        videoUrl: data.video_url,
      };
    } else {
      // Veo3 status check
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/operations/${taskId}`, {
        headers: {
          "x-goog-api-key": ENV.veo3ApiKey,
        },
      });

      if (!response.ok) {
        return { taskId, status: "failed", error: "Failed to check Veo3 video status" };
      }

      const data = await response.json();
      return {
        taskId,
        status: data.done ? "completed" : "processing",
        videoUrl: data.response?.video_url,
      };
    }
  } catch (error) {
    console.error("Video status check error:", error);
    return {
      taskId,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate video from storyboard shots
 */
export async function generateVideoFromStoryboard(
  shots: Array<{ shotNumber: number; prompt: string; imageUrl?: string }>,
  provider: "sora" | "veo3" = "sora"
): Promise<VideoGenerationResponse> {
  // Combine all shot prompts into a single video prompt
  const combinedPrompt = shots
    .map((shot) => `Shot ${shot.shotNumber}: ${shot.prompt}`)
    .join("\n");

  const fullPrompt = `Create a cinematic video sequence from these storyboard shots:\n${combinedPrompt}\n\nMaintain visual continuity and smooth transitions between shots.`;

  if (provider === "veo3") {
    return generateVideoWithVeo3({
      prompt: fullPrompt,
      duration: Math.min(shots.length * 3, 60), // 3 seconds per shot, max 60 seconds
      quality: "high",
    });
  } else {
    return generateVideoWithSora({
      prompt: fullPrompt,
      duration: Math.min(shots.length * 3, 60),
      quality: "high",
    });
  }
}
