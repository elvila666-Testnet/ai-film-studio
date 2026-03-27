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
          model: params.model || "sora-2.0",
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
        model: "sora-2.0",
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

export class Veo3Provider {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string = "https://generativelanguage.googleapis.com/v1beta") {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const startTime = Date.now();
    const modelId = params.model || "veo-3.1-generate-preview";

    try {
      // Veo 3.1 requires base64 inlineData for image inputs in instances
      let imageInstance = {};
      if (params.keyframeUrl) {
          const axios = (await import("axios")).default;
          const imageRes = await axios.get(params.keyframeUrl, { responseType: 'arraybuffer' });
          const base64 = Buffer.from(imageRes.data).toString('base64');
          imageInstance = {
              image: {
                  inlineData: {
                      mimeType: "image/png",
                      data: base64
                  }
              }
          };
      }

      const jsonBody = {
          instances: [{ 
              prompt: params.prompt,
              ...imageInstance
          }],
          parameters: {
            aspectRatio: params.resolution === "1080p" ? "16:9" : "1:1",
            resolution: params.resolution === "4k" ? "4k" : (params.resolution === "1080p" ? "1080p" : "720p"),
            videoOptions: {
                fps: params.fps || 24,
                duration: params.duration || 5
            }
          }
      };

      console.log(`[Veo3] Submitting request to ${modelId}:`, JSON.stringify(jsonBody, null, 2));

      const response = await fetch(`${this.apiUrl}/models/${modelId}:predictLongRunning?key=${this.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Veo3] API Error (${response.status}): ${errText} at ${this.apiUrl}/models/${modelId}:predict`);
        throw new Error(`Veo3 API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const operationName = data.name; // LRO operation name

      if (!operationName) {
        // If it's lucky and returned it immediately (unlikely for Veo)
        if (data.predictions?.[0]?.bytesBase64Encoded) {
          return this.formatResult(data, params, startTime);
        }
        throw new Error("Veo3 did not return an operation name or immediate result.");
      }

      // 2. Poll for completion
      console.log(`[Veo3] Started LRO: ${operationName}. Polling...`);
      const resultData = await this.pollOperation(operationName);

      return this.formatResult(resultData, params, startTime);
    } catch (error) {
      throw new Error(`Veo3 generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async pollOperation(operationName: string): Promise<any> {
    const maxAttempts = 60; // 5 minutes with 5s delay
    const delayMs = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, delayMs));

      const response = await fetch(`${this.apiUrl}/${operationName}?key=${this.apiKey}`);
      if (!response.ok) {
        console.warn(`[Veo3] Poll failed (${response.status}). Retrying...`);
        continue;
      }

      const data = await response.json();
      if (data.done) {
        if (data.error) {
          throw new Error(`Veo3 LRO failed: ${data.error.message}`);
        }
        return data.response;
      }

      console.log(`[Veo3] Still processing ${operationName} (attempt ${attempt + 1}/${maxAttempts})...`);
    }

    throw new Error("Veo3 generation timed out.");
  }

  private formatResult(data: any, params: VideoGenerationParams, startTime: number): VideoGenerationResult {
    const prediction = data.predictions?.[0] || data[0];
    const videoUrl = prediction.bytesBase64Encoded
      ? `data:video/mp4;base64,${prediction.bytesBase64Encoded}`
      : prediction.videoUrl || prediction.uri || "https://storage.googleapis.com/ai-film-studio-assets/placeholder.mp4";

    return {
      provider: "veo3",
      model: "veo-2.0",
      url: videoUrl,
      duration: params.duration,
      width: 1280,
      height: 720,
      fps: 24,
      fileSize: 0,
      actualCost: 0.18, // Fixed for now
      processingTime: Date.now() - startTime,
      metadata: {
        resolution: params.resolution,
      },
    };
  }

}

/**
 * Replicate Video Provider
 */
export class ReplicateVideoProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const startTime = Date.now();
    const modelId = params.model || "minimax/video-01"; // Default to Minimax on Replicate
    
    // Determine the Replicate model identifier
    // Note: Replicate uses the official 'minimax/video-01' path.
    let replicateModel = modelId;
    if (modelId === "minimax/video-01") replicateModel = "minimax/video-01:019747a177259169f448c4ae807469a4c51952e4a838de36f78d38e235e97576";

    try {
      console.log(`[ReplicateVideoProvider] Generating video with ${replicateModel}`);
      
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${this.apiKey}`,
        },
        body: JSON.stringify({
          version: replicateModel.includes(":") ? replicateModel.split(":")[1] : undefined,
          model: !replicateModel.includes(":") ? replicateModel : undefined,
          input: {
            prompt: params.prompt,
            first_frame_image: params.keyframeUrl,
            prompt_optimizer: true,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Replicate Video API error: ${response.status} ${errorText}`);
      }

      const prediction = await response.json();
      
      // We need to poll for completion
      const videoUrl = await this.pollPrediction(prediction.id);

      return {
        provider: "replicate",
        model: replicateModel,
        url: videoUrl,
        duration: params.duration,
        width: 1280,
        height: 720,
        fps: 24,
        fileSize: 0,
        actualCost: 0.15, // Approx cost for cinematic video
        processingTime: Date.now() - startTime,
        metadata: {
          predictionId: prediction.id,
        },
      };
    } catch (error) {
      throw new Error(`Replicate video generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async pollPrediction(id: string): Promise<string> {
    const maxAttempts = 60; // 5 minutes
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s

      const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
        },
      });

      if (!response.ok) continue;

      const data = await response.json();
      if (data.status === "succeeded") {
        // Replicate video returns an array or a string for the output
        return Array.isArray(data.output) ? data.output[0] : data.output;
      }

      if (data.status === "failed") {
        throw new Error(`Replicate prediction failed: ${data.error}`);
      }

      console.log(`[ReplicateVideoProvider] Polling: ${data.status}...`);
    }

    throw new Error("Replicate video generation timed out (Max 5 mins).");
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
  ): any {
    switch (provider) {
      case "flow":
        return new FlowProvider(apiKey, apiUrl);
      case "sora":
        return new SoraProvider(apiKey, apiUrl);
      case "kling":
        return new KlingProvider(apiKey, apiUrl);
      case "whan":
        return new WHANProvider(apiKey, apiUrl);
      case "veo3":
        return new Veo3Provider(apiKey, apiUrl);
      case "replicate":
        return new ReplicateVideoProvider(apiKey);
      default:
        throw new Error(`Unknown video provider: ${provider}`);
    }
  }
}
