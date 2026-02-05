/**
 * Image-to-Video Service
 * Converts storyboard frames to video using Veo3 or Sora 2
 * Maintains character and product consistency from the reference image
 */

export interface ImageToVideoRequest {
  imageUrl: string; // Storyboard frame (start frame)
  motionPrompt: string; // Description of camera/character movement
  duration: number; // Video duration in seconds (4-60)
  provider: "veo3" | "sora"; // Video provider
  characterLocked: boolean; // Enforce character consistency
  resolution: "720p" | "1080p" | "4k";
}

export interface ImageToVideoResponse {
  videoUrl: string;
  duration: number;
  provider: string;
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

/**
 * Generate video from storyboard image using Veo3
 */
export async function generateWithVeo3(
  request: ImageToVideoRequest
): Promise<ImageToVideoResponse> {
  try {
    if (!process.env.VEO3_API_KEY) {
      throw new Error("VEO3_API_KEY not configured");
    }

    const payload = {
      image_url: request.imageUrl,
      motion_prompt: request.motionPrompt,
      duration: Math.min(request.duration, 60),
      resolution: request.resolution === "4k" ? "2160p" : request.resolution,
      character_lock: request.characterLocked,
      output_format: "mp4",
    };

    const response = await fetch("https://api.veo.ai/v1/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.VEO3_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Veo3 API error: ${response.status}`);
    }

    const data = await response.json() as any;

    return {
      videoUrl: data.video_url || "",
      duration: request.duration,
      provider: "veo3",
      taskId: data.task_id || `veo3-${Date.now()}`,
      status: data.status || "pending",
    };
  } catch (error) {
    console.error("[Veo3] Generation error:", error);
    return {
      videoUrl: "",
      duration: request.duration,
      provider: "veo3",
      taskId: "",
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate video from storyboard image using Sora 2
 */
export async function generateWithSora(
  request: ImageToVideoRequest
): Promise<ImageToVideoResponse> {
  try {
    if (!process.env.SORA_API_KEY) {
      throw new Error("SORA_API_KEY not configured");
    }

    const payload = {
      model: "sora-2-latest",
      prompt: `[Start frame provided] ${request.motionPrompt}`,
      input_image_url: request.imageUrl,
      duration: Math.min(request.duration, 60),
      size: request.resolution === "4k" ? "2160p" : request.resolution,
      quality: "high",
    };

    const response = await fetch("https://api.openai.com/v1/videos/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SORA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sora API error: ${response.status}`);
    }

    const data = await response.json() as any;

    return {
      videoUrl: data.video_url || "",
      duration: request.duration,
      provider: "sora",
      taskId: data.id || `sora-${Date.now()}`,
      status: data.status || "pending",
    };
  } catch (error) {
    console.error("[Sora] Generation error:", error);
    return {
      videoUrl: "",
      duration: request.duration,
      provider: "sora",
      taskId: "",
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate video from image with automatic provider selection
 */
export async function generateImageToVideo(
  request: ImageToVideoRequest
): Promise<ImageToVideoResponse> {
  if (request.provider === "veo3") {
    return generateWithVeo3(request);
  } else if (request.provider === "sora") {
    return generateWithSora(request);
  } else {
    throw new Error(`Unsupported provider: ${request.provider}`);
  }
}

/**
 * Check video generation status
 */
export async function checkVideoStatus(
  taskId: string,
  provider: string
): Promise<ImageToVideoResponse> {
  try {
    if (provider === "veo3") {
      if (!process.env.VEO3_API_KEY) {
        throw new Error("VEO3_API_KEY not configured");
      }

      const response = await fetch(`https://api.veo.ai/v1/tasks/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.VEO3_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check Veo3 status: ${response.status}`);
      }

      const data = await response.json() as any;

      return {
        videoUrl: data.video_url || "",
        duration: 0,
        provider: "veo3",
        taskId,
        status: data.status,
      };
    } else if (provider === "sora") {
      if (!process.env.SORA_API_KEY) {
        throw new Error("SORA_API_KEY not configured");
      }

      const response = await fetch(
        `https://api.openai.com/v1/videos/generations/${taskId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${process.env.SORA_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to check Sora status: ${response.status}`);
      }

      const data = await response.json() as any;

      return {
        videoUrl: data.video_url || "",
        duration: 0,
        provider: "sora",
        taskId,
        status: data.status,
      };
    }

    throw new Error(`Unsupported provider: ${provider}`);
  } catch (error) {
    console.error(`[${provider}] Status check error:`, error);
    return {
      videoUrl: "",
      duration: 0,
      provider,
      taskId,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
