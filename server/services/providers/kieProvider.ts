import {
    ImageGenerationParams,
    ImageGenerationResult,
    VideoGenerationParams,
    VideoGenerationResult,
} from "./types";

/**
 * Kie.ai Provider - Unified AI Hub integration
 * Supports: Google Veo 3.1, Kling 2.1, Nano Banana, Midjourney, etc.
 */
export class KieProvider {
    private apiKey: string;
    private baseUrl = "https://api.kie.ai";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        if (!this.apiKey) {
            console.warn("[KieProvider] API Key missing. Kie.ai functions will fail.");
        }
    }

    private async withRetry<T>(fn: () => Promise<Response>, maxRetries = 3): Promise<any> {
        let lastError: any;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fn();
                if (response.ok) return await response.json();
                
                const errorText = await response.text();
                lastError = new Error(`Kie.ai API Error (${response.status}): ${errorText}`);
                
                if (![500, 502, 503, 504].includes(response.status) || attempt === maxRetries) {
                    break;
                }
                
                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`[KieProvider] Attempt ${attempt} failed. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (error: any) {
                lastError = error;
                if (attempt === maxRetries) break;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        throw lastError;
    }

    async generateImage(params: ImageGenerationParams, modelId: string = "flux-1.1-pro"): Promise<ImageGenerationResult> {
        const startTime = Date.now();
        const [width, height] = params.resolution.split("x").map(Number);
        
        console.log(`[KieProvider] Generating image with ${modelId}...`);

        const payload = {
            model: modelId,
            prompt: params.prompt,
            image_url: params.imageInputs?.[0], 
            aspect_ratio: this.mapResolutionToAspectRatio(params.resolution),
            quality: params.quality === "hd" ? "high" : "standard",
            seed: params.seed
        };

        const data = await this.withRetry(() => fetch(`${this.baseUrl}/v1/images/generations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(payload)
        }));

        const imageUrl = data.data?.[0]?.url || data.url;
        if (!imageUrl) throw new Error("Kie.ai did not return an image URL");

        return {
            provider: "kie",
            model: modelId,
            url: imageUrl,
            width: width || 1024,
            height: height || 1024,
            actualCost: 0.05,
            processingTime: Date.now() - startTime,
            metadata: {
                jobId: data.id || data.job_id,
                rawResponse: data
            }
        };
    }

    async generateVideo(params: VideoGenerationParams, modelId: string = "google/veo-3.1"): Promise<VideoGenerationResult> {
        const startTime = Date.now();
        console.log(`[KieProvider] Submitting video task for ${modelId}...`);

        // Normalizing model name for KIE API
        const targetModel = modelId.includes("veo") ? "google/veo-3.1" : 
                            modelId.includes("seadance") ? "seadance-2.0" :
                            modelId.includes("kling") ? "kling-2.1" :
                            modelId.includes("wan") ? "wan-2.1" : modelId;

        const payload = {
            model: targetModel,
            input: {
                prompt: params.prompt,
                image_url: params.input_image_url || params.keyframeUrl,
                duration: params.duration || 5,
                resolution: params.resolution === "4k" ? "3840x2160" : 
                            params.resolution === "1080p" ? "1920x1080" : "1280x720",
                fps: params.fps || 24
            }
        };

        const data = await this.withRetry(() => fetch(`${this.baseUrl}/api/v1/jobs/createTask`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(payload)
        }));

        const taskId = data.id || data.task_id || data.data?.taskId || data.taskId;
        if (!taskId) throw new Error("Kie.ai did not return a task ID for video generation. Response: " + JSON.stringify(data));

        console.log(`[KieProvider] Video task ${taskId} submitted. Polling for results...`);
        const result = await this.pollTask(taskId);

        return {
            provider: "kie",
            model: modelId,
            url: result.url || result.video_url || result.data?.url || result.data?.video_url,
            duration: params.duration,
            width: params.resolution === "4k" ? 3840 : 1920,
            height: params.resolution === "4k" ? 2160 : 1080,
            fps: params.fps,
            fileSize: 0,
            actualCost: 0.20,
            processingTime: Date.now() - startTime,
            metadata: {
                taskId: taskId,
                rawResponse: result
            }
        };
    }

    private async pollTask(taskId: string): Promise<any> {
        const maxAttempts = 120; // 10 minutes
        const delayMs = 5000;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, delayMs));

            try {
                const response = await fetch(`${this.baseUrl}/api/v1/jobs/recordInfo?taskId=${taskId}`, {
                    headers: { "Authorization": `Bearer ${this.apiKey}` }
                });

                if (!response.ok) {
                    console.warn(`[KieProvider] Polling returned status ${response.status}`);
                    continue;
                }

                const responseData = await response.json();
                const data = responseData.data || responseData; 
                const status = (data.status || data.state || "").toLowerCase();

                if (status === "succeeded" || status === "completed" || status === "success") {
                    return data;
                }

                if (status === "failed" || status === "fail" || status === "error") {
                    throw new Error(data.error_message || data.failReason || "Kie.ai task failed");
                }

                console.log(`[KieProvider] Task ${taskId} status: ${status} (attempt ${attempt + 1})`);
            } catch (err: any) {
                if (err.message.includes("failed") || err.message.includes("fail")) throw err;
                console.warn(`[KieProvider] Polling error: ${err.message}`);
            }
        }
        throw new Error(`Kie.ai task ${taskId} timed out.`);
    }


    private mapResolutionToAspectRatio(res: string): string {
        if (res.includes("1024x1024")) return "1:1";
        if (res.includes("1792x1024") || res.includes("1216x832")) return "16:9";
        if (res.includes("1024x1792") || res.includes("832x1216")) return "9:16";
        if (res.includes("1344x1024")) return "4:3";
        if (res.includes("1024x1344")) return "3:4";
        return "1:1";
    }
}
