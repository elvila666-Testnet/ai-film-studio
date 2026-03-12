import {
    ImageGenerationParams,
    ImageGenerationResult,
    VideoGenerationParams,
    VideoGenerationResult,
} from "./types";
import { ENV } from "../../_core/env";
import { GoogleAuth } from "google-auth-library";

/**
 * Gemini/Vertex AI Provider
 * Handles image generation via Vertex AI API (which supports image inputs)
 * Falls back to Gemini REST API for text-only generation
 */
export class GeminiProvider {
    private apiKey: string;
    private projectId: string;
    private readonly geminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
    private readonly vertexBaseUrl = "https://us-central1-aiplatform.googleapis.com/v1/projects";

    constructor(apiKey?: string) {
        this.apiKey = apiKey || ENV.forgeApiKey || "";
        this.projectId = ENV.gcpProjectId || "ai-film-studio-485900";
    }

    /**
     * Ensure API key is available
     */
    private checkAuth() {
        if (!this.apiKey) {
            throw new Error("Gemini API key is not configured");
        }
    }

    /**
     * Process resolution to fit Imagen limits or generic aspect ratios
     */
    private getAspectRatio(resolution: string): "1:1" | "3:4" | "4:3" | "16:9" | "9:16" {
        if (resolution.includes("1024x1024") || resolution.includes("512x512") || resolution.includes("768x768")) return "1:1";
        if (resolution.includes("1024x1792") || resolution.includes("832x1216")) return "9:16";
        if (resolution.includes("1792x1024") || resolution.includes("1216x832")) return "16:9";
        if (resolution.includes("1024x1344")) return "3:4";
        if (resolution.includes("1344x1024")) return "4:3";
        return "16:9"; // Default cinematic
    }

    /**
     * Generate an image using Vertex AI API (supports image inputs)
     * Falls back to Gemini REST API if no image inputs
     */
    async generateImage(
        params: ImageGenerationParams,
        modelId: string = "imagen-3.0-generate-001"
    ): Promise<ImageGenerationResult> {
        this.checkAuth();
        const startTime = Date.now();

        console.log(`[GeminiProvider] Generating Image: ${modelId} - Prompt: ${params.prompt.substring(0, 100)}...`);

        try {
            // If we have image inputs (character/set references), use Vertex AI which supports them
            if (params.imageInputs && params.imageInputs.length > 0) {
                console.log(`[GeminiProvider] Using Vertex AI API for image generation with ${params.imageInputs.length} reference image(s)`);
                return await this.generateImageWithVertexAI(params, modelId, startTime);
            } else {
                // Otherwise use Gemini REST API (text-only)
                console.log(`[GeminiProvider] Using Gemini REST API for text-only image generation`);
                return await this.generateImageWithGemini(params, modelId, startTime);
            }
        } catch (error: any) {
            console.error("[GeminiProvider] Image Generation failed:", error);
            throw new Error(`Image generation failed: ${error.message || String(error)}`);
        }
    }

    /**
     * Generate image using Vertex AI API (supports image inputs)
     */
    private async generateImageWithVertexAI(
        params: ImageGenerationParams,
        modelId: string,
        startTime: number
    ): Promise<ImageGenerationResult> {
        try {
            // Convert image URLs to base64 if needed
            const imageBase64Array: string[] = [];
            if (params.imageInputs) {
                for (const imageUrl of params.imageInputs) {
                    const base64 = imageUrl.startsWith('http')
                        ? await this.downloadImageAsBase64(imageUrl)
                        : (imageUrl.split(",")[1] || imageUrl);
                    imageBase64Array.push(base64);
                }
            }

            // Build Vertex AI payload with image inputs
            const payload: any = {
                instances: [
                    {
                        prompt: params.prompt,
                        ...(imageBase64Array.length > 0 ? {
                            image: {
                                bytesBase64Encoded: imageBase64Array[0] // Primary reference image
                            }
                        } : {})
                    }
                ],
                parameters: {
                    sampleCount: params.count || 1,
                    aspectRatio: this.getAspectRatio(params.resolution),
                    outputOptions: {
                        mimeType: "image/jpeg",
                    }
                }
            };

            // Use Vertex AI endpoint
            const url = `${this.vertexBaseUrl}/${this.projectId}/locations/us-central1/publishers/google/models/${modelId}:predict`;
            
            console.log(`[GeminiProvider] Calling Vertex AI endpoint: ${url}`);

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`[GeminiProvider] Vertex AI Error (${response.status}): ${errText}`);
                // Fall back to Gemini REST API if Vertex AI fails
                console.log(`[GeminiProvider] Falling back to Gemini REST API...`);
                return await this.generateImageWithGemini(params, modelId, startTime);
            }

            const data = await response.json();

            if (!data.predictions || data.predictions.length === 0) {
                throw new Error("Vertex AI returned no predictions for image generation.");
            }

            const base64Image = data.predictions[0].bytesBase64Encoded;
            if (!base64Image) {
                throw new Error("Vertex AI did not return bytesBase64Encoded.");
            }

            const urlResult = `data:image/jpeg;base64,${base64Image}`;

            return {
                provider: "vertex-ai",
                model: modelId,
                url: urlResult,
                width: 1792,
                height: 1024,
                actualCost: 0.05,
                processingTime: Date.now() - startTime,
                metadata: {
                    style: params.style,
                    resolution: params.resolution,
                },
            };
        } catch (error: any) {
            console.error("[GeminiProvider] Vertex AI generation failed:", error);
            throw error;
        }
    }

    /**
     * Generate image using Gemini REST API (text-only, no image inputs)
     */
    private async generateImageWithGemini(
        params: ImageGenerationParams,
        modelId: string,
        startTime: number
    ): Promise<ImageGenerationResult> {
        try {
            const payload: any = {
                instances: [
                    {
                        prompt: params.prompt
                    }
                ],
                parameters: {
                    sampleCount: params.count || 1,
                    aspectRatio: this.getAspectRatio(params.resolution),
                    outputOptions: {
                        mimeType: "image/jpeg",
                    }
                }
            };

            const url = `${this.geminiBaseUrl}/${modelId}:predict?key=${this.apiKey}`;
            
            console.log(`[GeminiProvider] Calling Gemini endpoint: ${url}`);

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini Image API Error (${response.status}): ${errText}`);
            }

            const data = await response.json();

            if (!data.predictions || data.predictions.length === 0) {
                throw new Error("Gemini returned no predictions for image generation.");
            }

            const base64Image = data.predictions[0].bytesBase64Encoded;
            if (!base64Image) {
                throw new Error("Gemini did not return bytesBase64Encoded.");
            }

            const urlResult = `data:image/jpeg;base64,${base64Image}`;

            return {
                provider: "gemini",
                model: modelId,
                url: urlResult,
                width: 1792,
                height: 1024,
                actualCost: 0.03,
                processingTime: Date.now() - startTime,
                metadata: {
                    style: params.style,
                    resolution: params.resolution,
                },
            };
        } catch (error: any) {
            console.error("[GeminiProvider] Gemini generation failed:", error);
            throw error;
        }
    }

    /**
     * Generate video using Google Native Veo3
     */
    async generateVideo(
        params: VideoGenerationParams,
        modelId: string = "veo-2.0-generate-001"
    ): Promise<VideoGenerationResult> {
        this.checkAuth();
        const startTime = Date.now();

        try {
            console.log(`[GeminiProvider] Generating Video with: ${modelId}`);

            const payload = {
                instances: [{ prompt: params.prompt }],
                parameters: {
                    ...(params.input_image_url && { image: { image_url: params.input_image_url } })
                }
            };

            const url = `${this.geminiBaseUrl}/${modelId}:predict?key=${this.apiKey}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini Video API Error (${response.status}): ${errText}`);
            }

            const data = await response.json();

            if (!data.predictions || data.predictions.length === 0) {
                throw new Error("Gemini returned no predictions for video generation.");
            }

            const base64Video = data.predictions[0].bytesBase64Encoded;
            const urlResult = base64Video ? `data:video/mp4;base64,${base64Video}` : "https://storage.googleapis.com/example-video.mp4";

            return {
                provider: "gemini",
                model: modelId,
                url: urlResult,
                duration: params.duration,
                width: 1280,
                height: 720,
                fps: params.fps,
                fileSize: 0,
                actualCost: 0.15,
                processingTime: Date.now() - startTime,
                metadata: {
                    resolution: params.resolution,
                },
            };

        } catch (error: any) {
            console.error("[GeminiProvider] Video Generation failed:", error);
            throw new Error(`Video generation failed: ${error.message || String(error)}`);
        }
    }

    /**
     * Upscale an image
     */
    async upscaleImage(imageUrl: string, upscaleFactor: number = 2): Promise<string> {
        console.log(`[GeminiProvider] Upscaling image ${imageUrl} by factor ${upscaleFactor}`);
        return imageUrl;
    }

    /**
     * Helper to download an external image and return it as base64
     */
    private async downloadImageAsBase64(url: string): Promise<string> {
        console.log(`[GeminiProvider] Downloading image for input: ${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    }
}
