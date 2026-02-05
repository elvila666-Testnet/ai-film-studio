/**
 * Video Generation Providers
 * Implementations for Flow, Sora, Kling, and WHAN
 */

import {
  VideoGenerationParams,
  VideoGenerationResult,
  VideoProvider,
} from "./types";

export class FlowProvider {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string = "https://api.flow.ai") {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
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
          keyframe_url: params.keyframeUrl,
          duration: params.duration,
          resolution: params.resolution,
          fps: params.fps,
          negative_prompt: params.negativePrompt,
          seed: params.seed,
        }),
      });

      if (!response.ok) {
        throw new Error(`Flow API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const [width, height] = this.parseResolution(params.resolution);

      return {
        provider: "flow",
        model: "flow-v1",
        url: data.video_url,
        duration: params.duration,
        width,
        height,
        fps: params.fps,
        fileSize: data.file_size || 0,
        actualCost: this.calculateCost(params.duration, params.resolution),
        processingTime: Date.now() - startTime,
        metadata: {
          jobId: data.job_id,
          status: data.status,
        },
      };
    } catch (error) {
      throw new Error(`Flow generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private parseResolution(resolution: string): [number, number] {
    switch (resolution) {
      case "720p":
        return [1280, 720];
      case "1080p":
        return [1920, 1080];
      case "4k":
        return [3840, 2160];
      default:
        return [1280, 720];
    }
  }

  private calculateCost(duration: number, resolution: string): number {
    const minutes = duration / 60;
    const baseCost = resolution === "1080p" ? 0.1 : 0.05;
    return baseCost * minutes;
  }
}

export class SoraProvider {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string = "https://api.openai.com/v1") {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.apiUrl}/videos/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: params.prompt,
          model: "sora-1.0",
          duration: Math.min(params.duration, 120), // Sora max 120s
          quality: "hd",
        }),
      });

      if (!response.ok) {
        throw new Error(`Sora API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const [width, height] = this.parseResolution(params.resolution);

      return {
        provider: "sora",
        model: "sora-1.0",
        url: data.data[0].url,
        duration: params.duration,
        width,
        height,
        fps: 24,
        fileSize: data.data[0].file_size || 0,
        actualCost: this.calculateCost(params.duration, params.resolution),
        processingTime: Date.now() - startTime,
        metadata: {
          id: data.data[0].id,
        },
      };
    } catch (error) {
      throw new Error(`Sora generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private parseResolution(resolution: string): [number, number] {
    switch (resolution) {
      case "720p":
        return [1280, 720];
      case "1080p":
        return [1920, 1080];
      case "4k":
        return [3840, 2160];
      default:
        return [1280, 720];
    }
  }

  private calculateCost(duration: number, resolution: string): number {
    const minutes = duration / 60;
    const baseCost = resolution === "4k" ? 0.3 : resolution === "1080p" ? 0.15 : 0.1;
    return baseCost * minutes;
  }
}

export class KlingProvider {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string = "https://api.kling.ai") {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.apiUrl}/v1/videos/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: params.prompt,
          image_url: params.keyframeUrl,
          duration: Math.min(params.duration, 90),
          resolution: params.resolution,
          fps: params.fps,
          negative_prompt: params.negativePrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Kling API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const [width, height] = this.parseResolution(params.resolution);

      return {
        provider: "kling",
        model: "kling-v1",
        url: data.video_url,
        duration: params.duration,
        width,
        height,
        fps: params.fps,
        fileSize: data.file_size || 0,
        actualCost: this.calculateCost(params.duration, params.resolution),
        processingTime: Date.now() - startTime,
        metadata: {
          taskId: data.task_id,
        },
      };
    } catch (error) {
      throw new Error(`Kling generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private parseResolution(resolution: string): [number, number] {
    switch (resolution) {
      case "720p":
        return [1280, 720];
      case "1080p":
        return [1920, 1080];
      case "4k":
        return [3840, 2160];
      default:
        return [1280, 720];
    }
  }

  private calculateCost(duration: number, resolution: string): number {
    const minutes = duration / 60;
    const baseCost = resolution === "1080p" ? 0.12 : 0.08;
    return baseCost * minutes;
  }
}

export class WHANProvider {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string = "https://api.whan.ai") {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.apiUrl}/video/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: params.prompt,
          reference_image: params.keyframeUrl,
          duration: Math.min(params.duration, 120),
          resolution: params.resolution,
          fps: params.fps,
          seed: params.seed,
        }),
      });

      if (!response.ok) {
        throw new Error(`WHAN API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const [width, height] = this.parseResolution(params.resolution);

      return {
        provider: "whan",
        model: "whan-v1",
        url: data.video_url,
        duration: params.duration,
        width,
        height,
        fps: params.fps,
        fileSize: data.file_size || 0,
        actualCost: this.calculateCost(params.duration, params.resolution),
        processingTime: Date.now() - startTime,
        metadata: {
          requestId: data.request_id,
        },
      };
    } catch (error) {
      throw new Error(`WHAN generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private parseResolution(resolution: string): [number, number] {
    switch (resolution) {
      case "720p":
        return [1280, 720];
      case "1080p":
        return [1920, 1080];
      case "4k":
        return [3840, 2160];
      default:
        return [1280, 720];
    }
  }

  private calculateCost(duration: number, resolution: string): number {
    const minutes = duration / 60;
    const baseCost = resolution === "4k" ? 0.22 : resolution === "1080p" ? 0.11 : 0.06;
    return baseCost * minutes;
  }
}

/**
 * Video Provider Factory
 */
export class VideoProviderFactory {
  static createProvider(
    provider: VideoProvider,
    apiKey: string,
    apiUrl?: string
  ): FlowProvider | SoraProvider | KlingProvider | WHANProvider {
    switch (provider) {
      case "flow":
        return new FlowProvider(apiKey, apiUrl);
      case "sora":
        return new SoraProvider(apiKey, apiUrl);
      case "kling":
        return new KlingProvider(apiKey, apiUrl);
      case "whan":
        return new WHANProvider(apiKey, apiUrl);
      default:
        throw new Error(`Unknown video provider: ${provider}`);
    }
  }
}
