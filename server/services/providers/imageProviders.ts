/**
 * Image Generation Providers
 * Implementations for DALL-E, Midjourney, and NanoBanana
 */

import {
  ImageGenerationParams,
  ImageGenerationResult,
  ImageProvider,
} from "./types";

export class DALLEProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: params.prompt,
          model: "dall-e-3",
          size: params.resolution,
          quality: params.quality,
          n: params.count || 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`DALL-E API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const imageUrl = data.data[0].url;
      const [width, height] = params.resolution.split("x").map(Number);

      return {
        provider: "dalle",
        model: "dall-e-3",
        url: imageUrl,
        width,
        height,
        actualCost: 0.02, // Placeholder - actual cost varies by quality/size
        processingTime: Date.now() - startTime,
        metadata: {
          revisedPrompt: data.data[0].revised_prompt,
        },
      };
    } catch (error) {
      throw new Error(`DALL-E generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export class MidjourneyProvider {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string = "https://api.midjourney.com") {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async generateImage(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.apiUrl}/imagine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: params.prompt,
          aspect_ratio: this.parseResolution(params.resolution),
          quality: params.quality === "hd" ? "hd" : "standard",
          seed: params.seed,
        }),
      });

      if (!response.ok) {
        throw new Error(`Midjourney API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const [width, height] = params.resolution.split("x").map(Number);

      return {
        provider: "midjourney",
        model: "midjourney-v6",
        url: data.image_url,
        width,
        height,
        actualCost: 0.015,
        processingTime: Date.now() - startTime,
        metadata: {
          jobId: data.job_id,
        },
      };
    } catch (error) {
      throw new Error(`Midjourney generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private parseResolution(resolution: string): string {
    const [width, height] = resolution.split("x").map(Number);
    const ratio = width / height;

    if (Math.abs(ratio - 1) < 0.1) return "1:1";
    if (Math.abs(ratio - 16 / 9) < 0.1) return "16:9";
    if (Math.abs(ratio - 9 / 16) < 0.1) return "9:16";

    return "1:1";
  }
}

export class NanoBananaProvider {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string = "https://api.nanobanana.ai") {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async generateImage(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.apiUrl}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: params.prompt,
          negative_prompt: params.negativePrompt,
          width: parseInt(params.resolution.split("x")[0]),
          height: parseInt(params.resolution.split("x")[1]),
          quality: params.quality,
          seed: params.seed,
          steps: params.quality === "hd" ? 50 : 30,
        }),
      });

      if (!response.ok) {
        throw new Error(`NanoBanana API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const [width, height] = params.resolution.split("x").map(Number);

      return {
        provider: "nanobanana",
        model: "nanobanana-pro",
        url: data.image_url,
        width,
        height,
        actualCost: 0.01,
        processingTime: Date.now() - startTime,
        metadata: {
          seed: data.seed,
          steps: data.steps,
        },
      };
    } catch (error) {
      throw new Error(`NanoBanana generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Image Provider Factory
 */
export class ImageProviderFactory {
  static createProvider(
    provider: ImageProvider,
    apiKey: string,
    apiUrl?: string
  ): DALLEProvider | MidjourneyProvider | NanoBananaProvider {
    switch (provider) {
      case "dalle":
        return new DALLEProvider(apiKey);
      case "midjourney":
        return new MidjourneyProvider(apiKey, apiUrl);
      case "nanobanana":
        return new NanoBananaProvider(apiKey, apiUrl);
      default:
        throw new Error(`Unknown image provider: ${provider}`);
    }
  }
}
