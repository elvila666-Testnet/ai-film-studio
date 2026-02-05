import { ENV } from "../_core/env";

interface NanobananProGenerateRequest {
  prompt: string;
  resolution?: "1k" | "2k" | "4k";
  num_images?: number;
  style?: string;
}

interface NanobananProGenerateResponse {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  images?: string[];
  error?: string;
}

interface TaskDetailsResponse {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  images?: string[];
  error?: string;
}

const NANOBANANA_API_BASE = "https://api.nanobananaapi.ai/api/v1";
const NANOBANANA_API_KEY = ENV.nanobananaApiKey;

/**
 * Generate an image using Nanobanana Pro API with optional reference images
 */
export async function generateImageWithNanobanana(
  prompt: string,
  resolution: "1k" | "2k" | "4k" = "2k",
  referenceImages?: string[]
): Promise<string> {
  if (!NANOBANANA_API_KEY) {
    throw new Error("Nanobanana API key not configured");
  }

  try {
    // Submit generation request
    const generateResponse = await fetch(
      `${NANOBANANA_API_BASE}/nanobanana/generate-pro`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${NANOBANANA_API_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          resolution,
          num_images: 1,
          ...(referenceImages && referenceImages.length > 0 && {
            reference_images: referenceImages,
            image_influence: 0.7, // 70% influence from reference images
          }),
        }),
      }
    );

    if (!generateResponse.ok) {
      const error = await generateResponse.text();
      throw new Error(
        `Nanobanana API error: ${generateResponse.status} - ${error}`
      );
    }

    const generateData: NanobananProGenerateResponse =
      await generateResponse.json();

    if (generateData.status === "failed") {
      throw new Error(`Image generation failed: ${generateData.error}`);
    }

    // If images are returned immediately, use them
    if (generateData.images && generateData.images.length > 0) {
      return generateData.images[0];
    }

    // Otherwise, poll for task completion
    const taskId = generateData.task_id;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      const taskResponse = await fetch(
        `${NANOBANANA_API_BASE}/nanobanana/task/${taskId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${NANOBANANA_API_KEY}`,
          },
        }
      );

      if (!taskResponse.ok) {
        throw new Error(
          `Failed to get task status: ${taskResponse.status}`
        );
      }

      const taskData: TaskDetailsResponse = await taskResponse.json();

      if (taskData.status === "completed" && taskData.images) {
        return taskData.images[0];
      } else if (taskData.status === "failed") {
        throw new Error(`Image generation failed: ${taskData.error}`);
      }

      attempts++;
    }

    throw new Error("Image generation timeout");
  } catch (error) {
    console.error("Nanobanana image generation error:", error);
    throw error;
  }
}

/**
 * Get account credits for Nanobanana Pro API
 */
export async function getNanobanaCredits(): Promise<number> {
  if (!NANOBANANA_API_KEY) {
    throw new Error("Nanobanana API key not configured");
  }

  try {
    const response = await fetch(
      `${NANOBANANA_API_BASE}/common/credit`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${NANOBANANA_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get credits: ${response.status}`);
    }

    const data = await response.json();
    return data.data || 0;
  } catch (error) {
    console.error("Failed to get Nanobanana credits:", error);
    throw error;
  }
}

/**
 * Generate image with character consistency (multi-image blending)
 */
export async function generateImageWithConsistency(
  prompt: string,
  referenceImages: string[] = [],
  resolution: "1k" | "2k" | "4k" = "2k"
): Promise<string> {
  if (!NANOBANANA_API_KEY) {
    throw new Error("Nanobanana API key not configured");
  }

  try {
    const body: any = {
      prompt,
      resolution,
      num_images: 1,
    };

    // Add reference images if provided (up to 8)
    if (referenceImages.length > 0) {
      body.reference_images = referenceImages.slice(0, 8);
    }

    const generateResponse = await fetch(
      `${NANOBANANA_API_BASE}/nanobanana/generate-pro`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${NANOBANANA_API_KEY}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!generateResponse.ok) {
      const error = await generateResponse.text();
      throw new Error(
        `Nanobanana API error: ${generateResponse.status} - ${error}`
      );
    }

    const generateData: NanobananProGenerateResponse =
      await generateResponse.json();

    if (generateData.status === "failed") {
      throw new Error(`Image generation failed: ${generateData.error}`);
    }

    // If images are returned immediately, use them
    if (generateData.images && generateData.images.length > 0) {
      return generateData.images[0];
    }

    // Otherwise, poll for task completion
    const taskId = generateData.task_id;
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const taskResponse = await fetch(
        `${NANOBANANA_API_BASE}/nanobanana/task/${taskId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${NANOBANANA_API_KEY}`,
          },
        }
      );

      if (!taskResponse.ok) {
        throw new Error(
          `Failed to get task status: ${taskResponse.status}`
        );
      }

      const taskData: TaskDetailsResponse = await taskResponse.json();

      if (taskData.status === "completed" && taskData.images) {
        return taskData.images[0];
      } else if (taskData.status === "failed") {
        throw new Error(`Image generation failed: ${taskData.error}`);
      }

      attempts++;
    }

    throw new Error("Image generation timeout");
  } catch (error) {
    console.error("Nanobanana image generation error:", error);
    throw error;
  }
}
