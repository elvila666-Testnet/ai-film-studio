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
  private projectId: string;
  private readonly vertexBaseUrl = "https://us-central1-aiplatform.googleapis.com/v1";

  constructor(_apiKey: string, _apiUrl?: string) {
    this.projectId = process.env.GCP_PROJECT_ID || "ai-film-studio-485900";
  }

  /**
   * Acquire OAuth2 access token for Vertex AI.
   * On Cloud Run the service account is automatic; locally it uses ADC.
   */
  private async getAccessToken(): Promise<string> {
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({ scopes: "https://www.googleapis.com/auth/cloud-platform" });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse.token) {
      throw new Error("Failed to obtain GCP access token for Vertex AI");
    }
    return tokenResponse.token;
  }

  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const startTime = Date.now();
    const modelId = params.model || "veo-3.0-generate-001";

    try {
      // 1. Prepare image instance if keyframe is provided
      let imageInstance: Record<string, unknown> = {};
      if (params.keyframeUrl) {
          const axios = (await import("axios")).default;
          const imageRes = await axios.get(params.keyframeUrl, { responseType: 'arraybuffer' });
          const base64 = Buffer.from(imageRes.data).toString('base64');
          // Vertex AI requires mimeType alongside bytesBase64Encoded
          const contentType = (imageRes.headers['content-type'] as string) || "image/jpeg";
          const mimeType = contentType.split(';')[0].trim(); // Strip charset if present
          imageInstance = {
              image: {
                  bytesBase64Encoded: base64,
                  mimeType: mimeType
              }
          };
          console.log(`[Veo3] Image downloaded: ${base64.length} chars, mimeType: ${mimeType}`);
      }

      const jsonBody = {
          instances: [{ 
              prompt: params.prompt,
              ...imageInstance
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
            personGeneration: "allow_adult",
            storageUri: `gs://${process.env.GCS_BUCKET_NAME || "ai-film-studio-assets"}/veo-output/`,
          }
      };

      // 2. Get OAuth token (Vertex AI requires Bearer token, not API key)
      const accessToken = await this.getAccessToken();
      const url = `${this.vertexBaseUrl}/projects/${this.projectId}/locations/us-central1/publishers/google/models/${modelId}:predictLongRunning`;

      console.log(`[Veo3] Submitting to Vertex AI: ${url}`);
      console.log(`[Veo3] Payload:`, JSON.stringify({ ...jsonBody, instances: [{ prompt: jsonBody.instances[0].prompt.substring(0, 80) + "...", hasImage: !!params.keyframeUrl }] }, null, 2));

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify(jsonBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Veo3] Vertex AI Error (${response.status}): ${errText}`);
        throw new Error(`Veo3 API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const operationName = data.name; // LRO operation name (e.g., "projects/.../operations/...")

      if (!operationName) {
        // Immediate result (unlikely for video)
        if (data.predictions?.[0]?.bytesBase64Encoded) {
          return this.formatResult(data, params, startTime);
        }
        throw new Error("Veo3 did not return an operation name or immediate result.");
      }

      // 3. Poll the LRO for completion
      console.log(`[Veo3] Started LRO: ${operationName}. Polling...`);
      const resultData = await this.pollOperation(operationName, accessToken);

      return this.formatResult(resultData, params, startTime);
    } catch (error) {
      throw new Error(`Veo3 generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async pollOperation(operationName: string, accessToken: string): Promise<Record<string, unknown>> {
    const maxAttempts = 60; // 5 minutes with 5s delay
    const delayMs = 5000;

    // Extract modelId from operation name: "projects/.../models/MODEL_ID/operations/..."
    const modelMatch = operationName.match(/models\/([^/]+)/);
    const modelId = modelMatch?.[1] || "veo-2.0-generate-001";
    const fetchUrl = `${this.vertexBaseUrl}/projects/${this.projectId}/locations/us-central1/publishers/google/models/${modelId}:fetchPredictOperation`;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, delayMs));

      const response = await fetch(fetchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ operationName }),
      });

      if (!response.ok) {
        console.warn(`[Veo3] Poll failed (${response.status}). Retrying...`);
        // Re-acquire token if it may have expired (after ~30 min)
        if (response.status === 401 && attempt > 0) {
          console.log(`[Veo3] Token may have expired, re-acquiring...`);
          accessToken = await this.getAccessToken();
        }
        continue;
      }

      const data = await response.json();
      if (data.done) {
        if (data.error) {
          throw new Error(`Veo3 LRO failed: ${data.error.message}`);
        }
        console.log(`[Veo3] LRO completed after ${attempt + 1} polls.`);
        return data.response || data;
      }

      console.log(`[Veo3] Still processing (attempt ${attempt + 1}/${maxAttempts})...`);
    }

    throw new Error("Veo3 generation timed out (5 min).");
  }

  private formatResult(data: Record<string, unknown>, params: VideoGenerationParams, startTime: number): VideoGenerationResult {
    // Veo returns: { videos: [{ gcsUri: "gs://...", mimeType: "video/mp4" }], raiMediaFilteredCount: 0 }
    const videos = (data as Record<string, unknown>).videos as Array<Record<string, string>> | undefined;

    let videoUrl = "";
    if (videos?.[0]?.gcsUri) {
      // Convert gs:// URI to public HTTPS URL
      const gcsUri = videos[0].gcsUri;
      videoUrl = gcsUri.replace("gs://", "https://storage.googleapis.com/");
      console.log(`[Veo3] Video stored at: ${gcsUri} -> ${videoUrl}`);
    } else {
      // Fallback: check for bytesBase64Encoded or other fields
      const predictions = (data as Record<string, unknown>).predictions as Array<Record<string, unknown>> | undefined;
      const prediction = predictions?.[0] || (data as Record<string, unknown>);
      const bytesBase64 = prediction.bytesBase64Encoded as string | undefined;
      videoUrl = bytesBase64
        ? `data:video/mp4;base64,${bytesBase64}`
        : (prediction.videoUri as string) || (prediction.uri as string) || "";
    }

    return {
      provider: "veo3",
      model: params.model || "veo-3.0-generate-001",
      url: videoUrl,
      duration: params.duration,
      width: 1280,
      height: 720,
      fps: 24,
      fileSize: 0,
      actualCost: 0.18,
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
 * KIE.ai Video Provider
 * Supports Seedance 2.0, Kling 3.0, and Wan 2.6
 */
export class KieProvider {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string = "https://api.kie.ai") {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const startTime = Date.now();
    
    // Map model from params.model to KIE marketplace endpoint
    let endpoint = "";
    const model = params.model || "kie-seedance-2-0";

    switch (model) {
      case "kie-seedance-2-0":
        endpoint = "/market/bytedance/seedance-2";
        break;
      case "kie-kling-3-0":
        endpoint = "/market/kling/kling-3-0";
        break;
      case "kie-wan-2-6":
        endpoint = "/market/wan/2-6-image-to-video";
        break;
      default:
        endpoint = "/market/bytedance/seedance-2";
    }

    try {
      console.log(`[KieProvider] Submitting task to ${endpoint}`);
      const body = {
        prompt: params.prompt,
        image_url: params.keyframeUrl || params.input_image_url,
      };

      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`KIE API submission failed (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const taskId = data.task_id;

      if (!taskId) {
        throw new Error("KIE API did not return a task_id");
      }

      console.log(`[KieProvider] Task ${taskId} created for model ${model}. Polling...`);
      
      // Poll for result
      const result = await this.pollTask(taskId);
      const [width, height] = this.parseResolution(params.resolution);

      return {
        provider: "kie",
        model: model,
        url: result.video_url || result.url || "",
        duration: params.duration,
        width,
        height,
        fps: params.fps || 24,
        fileSize: 0,
        actualCost: 0.15, // Approx cost, service-specific
        processingTime: Date.now() - startTime,
        metadata: {
          taskId,
          status: result.status || result.state,
        },
      };
    } catch (error) {
      throw new Error(`KIE generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async pollTask(taskId: string): Promise<any> {
    const maxAttempts = 120; // 10 minutes total
    const delayMs = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, delayMs));

      try {
        const response = await fetch(`${this.apiUrl}/market/common/get-task-detail?task_id=${taskId}`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        });

        if (!response.ok) {
          console.warn(`[KieProvider] Poll attempt ${attempt + 1} failed with status ${response.status}`);
          continue;
        }

        const data = await response.json();
        const status = (data.status || data.state || "").toLowerCase();

        if (status === "succeeded" || status === "completed" || status === "success") {
          return data;
        }

        if (status === "failed" || status === "error") {
          throw new Error(data.error_message || data.msg || "KIE task reported failure status");
        }

        console.log(`[KieProvider] Task ${taskId} status: ${status} (attempt ${attempt + 1}/${maxAttempts})`);
      } catch (err: any) {
        if (err.message.includes("KIE task reported failure")) throw err;
        console.warn(`[KieProvider] Polling error: ${err.message}. Retrying...`);
      }
    }

    throw new Error(`KIE task ${taskId} timed out after 10 minutes.`);
  }

  private parseResolution(resolution: string): [number, number] {
    switch (resolution) {
      case "720p": return [1280, 720];
      case "1080p": return [1920, 1080];
      case "4k": return [3840, 2160];
      default: return [1280, 720];
    }
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
      case "gemini":
        return new Veo3Provider(apiKey, apiUrl);
      case "replicate":
        return new ReplicateVideoProvider(apiKey);
      case "kie":
        return new KieProvider(apiKey, apiUrl);
      default:
        throw new Error(`Unknown video provider: ${provider}`);
    }
  }
}
