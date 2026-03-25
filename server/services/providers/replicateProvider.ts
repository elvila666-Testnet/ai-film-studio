import Replicate from "replicate";
import { ImageGenerationParams, ImageGenerationResult } from "./types";

export class ReplicateProvider {
    private replicate: Replicate;

    constructor(apiKey: string) {
        this.replicate = new Replicate({ auth: apiKey });
    }

    private async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
        let lastError: any;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;
                const status = error.status || (error.message?.match(/status (\d+)/)?.[1]);
                const isTransient = [500, 502, 503, 504].includes(Number(status)) || 
                                   error.message?.includes("ETIMEDOUT") || 
                                   error.message?.includes("ECONNRESET");

                if (!isTransient || attempt === maxRetries) {
                    break;
                }

                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`[ReplicateProvider] Attempt ${attempt} failed with ${status}. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        // Sanitize error message if it contains HTML
        let message = lastError.message || String(lastError);
        if (message.includes("<!DOCTYPE html>") || message.includes("<html")) {
            const statusMatch = message.match(/status (\d+)/);
            message = `Replicate service is currently unavailable${statusMatch ? ` (Status ${statusMatch[1]})` : ""}. Please try again in 1 minute.`;
        }

        throw new Error(message);
    }

    async generateImage(params: ImageGenerationParams, modelId?: string): Promise<ImageGenerationResult> {
        const startTime = Date.now();
        const hasImageRefs = params.imageInputs && params.imageInputs.length > 0;
        const isGrid = params.resolution === "1792x1024" || params.resolution === "1024x1792" || params.prompt.toLowerCase().includes("grid");

        // Default to schnëll for fast text-to-image, or dev/pro for high quality/image-to-image
        // If image inputs are provided, we must use a model that supports image_prompt or image-to-image
        let replicateModel = "black-forest-labs/flux-schnell";
        
        if (modelId?.toLowerCase().includes("banana") || modelId?.toLowerCase().includes("nano")) {
            replicateModel = "google/nano-banana-pro";
        } else if (hasImageRefs) {
            replicateModel = "black-forest-labs/flux-pro";
        } else if (params.quality === "hd" || modelId?.includes("pro") || modelId?.includes("1.1")) {
            replicateModel = "black-forest-labs/flux-1.1-pro";
        }

        try {
            console.log(`[ReplicateProvider] Generating image with model: ${replicateModel} (Anchors: ${hasImageRefs ? params.imageInputs!.length : 0})`);

            const input: any = {
                prompt: params.prompt,
            };

            // Aspect ratio mapping for Replicate Flux models
            const [width, height] = params.resolution.split("x").map(Number);
            const ratio = width / height;
            let aspectRatio = "1:1";
            if (ratio > 1.7) aspectRatio = "16:9";
            else if (ratio < 0.6) aspectRatio = "9:16";
            else if (ratio > 1.2) aspectRatio = "3:2";
            else if (ratio < 0.8) aspectRatio = "2:3";
            else if (ratio > 1.1) aspectRatio = "4:3";
            else if (ratio < 0.9) aspectRatio = "3:4";

            input.aspect_ratio = aspectRatio;
            input.output_format = "jpg";
            input.output_quality = 90;

            if (params.seed) {
                input.seed = params.seed;
            }

            // Handle image-to-image / anchors
            if (hasImageRefs) {
                if (replicateModel.includes("nano-banana-pro")) {
                    // Nano Banana Pro expects an array of URIs under 'image_input'
                    input.image_input = params.imageInputs;
                } else if (!isGrid) {
                    // Flux Pro Img2Img: ONLY use for single frames, NOT for grids.
                    // If it's a grid, we want Text-to-Image with the grid layout prompt, 
                    // and anchors should be used as references (LoRA/etc) not as the canvas.
                    input.image = params.imageInputs![0];
                    input.prompt_strength = 0.85;
                } else {
                    console.log("[ReplicateProvider] Skipping Img2Img for Grid request to preserve layout. Using anchors as semantic context only.");
                }
            }

            const output = await this.withRetry(() => 
                this.replicate.run(
                    replicateModel as any,
                    { input }
                )
            );

            // Replicate output is usually an array of URLs for Flux or a single stream String
            let imageUrl = "";
            if (Array.isArray(output)) {
                imageUrl = String(output[0]);
            } else if (typeof output === "string") {
                imageUrl = output;
            } else if (output && typeof output === "object") {
                // some models return ReadableStream, some return string URL
                imageUrl = output.toString();
            }

            if (!imageUrl) {
                throw new Error("Replicate API did not return a valid image URL.");
            }

            return {
                provider: "replicate",
                model: modelId || replicateModel,
                url: imageUrl,
                width,
                height,
                actualCost: hasImageRefs ? 0.03 : 0.01,
                processingTime: Date.now() - startTime,
                metadata: {
                    seed: params.seed,
                    aspectRatio,
                    imageAnchorsUsed: hasImageRefs
                }
            };
        } catch (error: any) {
            console.error("[ReplicateProvider] Generation failed:", error.message);
            throw error; // Re-throw the already sanitized error from withRetry
        }
    }
}
