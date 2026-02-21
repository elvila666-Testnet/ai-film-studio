import Replicate from "replicate";
import { ENV } from "../../_core/env";
import { storagePut } from "../../storage";
import { logUsage } from "../../src/services/ledgerService";
import {
    ImageGenerationParams,
    ImageGenerationResult,
    VideoGenerationParams,
    VideoGenerationResult,
} from "./types";

/**
 * Replicate Provider
 * Handles image and video generation via Replicate's unified API
 */
export class ReplicateProvider {
    private replicate: Replicate;

    constructor(apiKey: string) {
        this.replicate = new Replicate({
            auth: apiKey || ENV.replicateApiKey,
        });
    }

    /**
     * Generate an image using Replicate
     */
    async generateImage(params: ImageGenerationParams, model: string = "black-forest-labs/flux-schnell"): Promise<ImageGenerationResult> {
        const startTime = Date.now();

        try {
            // Create prediction
            const output = await this.replicate.run(
                model as any,
                {
                    input: {
                        prompt: params.prompt,
                        aspect_ratio: this.mapResolutionToAspectRatio(params.resolution),
                        num_outputs: params.count || 1,
                        output_format: "png",
                        output_quality: params.quality === "hd" ? 90 : 80,
                        seed: params.seed,
                    }
                }
            );

            const firstOutput = Array.isArray(output) ? output[0] : output;
            console.log(`[Replicate] Raw output type:`, typeof firstOutput);
            // Handle Replicate's flexible output types (string, object with .url property, or object with .url() method)
            let imageUrl = "";
            if (typeof firstOutput === 'string') {
                imageUrl = firstOutput;
            } else if (firstOutput && typeof (firstOutput as any).url === 'function') {
                imageUrl = (firstOutput as any).url();
            } else if (firstOutput && (firstOutput as any).url) {
                imageUrl = (firstOutput as any).url;
            } else {
                imageUrl = String(firstOutput);
            }

            console.log(`[Replicate] Resolved Image URL:`, imageUrl);

            // 1. Download from Replicate
            const response = await fetch(imageUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // 2. Upload to GCS
            const filename = `generated/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
            const { url: gcsUrl } = await storagePut(filename, buffer, "image/png");
            console.log(`[Replicate] Asset secured at: ${gcsUrl}`);

            // 3. Log Usage
            if (params.projectId && params.userId) {
                const cost = params.quality === "hd" ? 0.04 : 0.005; // Adjusted typical costs
                await logUsage(
                    params.projectId,
                    params.userId,
                    model,
                    cost,
                    "IMAGE_GEN",
                    1
                );
            }

            const [width, height] = params.resolution.split("x").map(Number);

            return {
                provider: "replicate",
                model: model,
                url: gcsUrl, // Return GCS URL
                width: width || 1024,
                height: height || 1024,
                actualCost: params.quality === "hd" ? 0.04 : 0.005,
                processingTime: Date.now() - startTime,
                metadata: {
                    raw_output: output,
                    replicate_url: imageUrl
                },
            };
        } catch (error) {
            throw new Error(`Replicate image generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Upscale an image to 4k using Replicate
     */
    async upscaleImage(imageUrl: string, projectId?: number, userId?: string, scale: number = 4): Promise<string> {
        const startTime = Date.now();
        try {
            console.log(`[Replicate] Upscaling image ${imageUrl}...`);
            const output = await this.replicate.run(
                "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
                {
                    input: {
                        image: imageUrl,
                        scale: scale,
                        face_enhance: true
                    }
                }
            );

            const firstOutput = Array.isArray(output) ? output[0] : output;
            let finalImageUrl = "";
            if (typeof firstOutput === 'string') {
                finalImageUrl = firstOutput;
            } else if (firstOutput && typeof (firstOutput as any).url === 'function') {
                finalImageUrl = (firstOutput as any).url();
            } else if (firstOutput && (firstOutput as any).url) {
                finalImageUrl = (firstOutput as any).url;
            } else {
                finalImageUrl = String(firstOutput);
            }

            console.log(`[Replicate] Upscale resolved URL:`, finalImageUrl);

            // 1. Download & upload to GCS for permanence
            const response = await fetch(finalImageUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const filename = `upscaled/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
            const { url: gcsUrl } = await storagePut(filename, buffer, "image/png");
            console.log(`[Replicate] Upscaled Asset secured at: ${gcsUrl}`);

            // 2. Log Usage
            if (projectId && userId) {
                await logUsage(
                    projectId,
                    userId,
                    "nightmareai/real-esrgan",
                    0.02, // Estimated cost
                    "IMAGE_GEN",
                    1
                );
            }

            return gcsUrl;
        } catch (error) {
            throw new Error(`Replicate image upscale failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Generate a video using Replicate (Async with Polling)
     */
    async generateVideo(params: VideoGenerationParams, model: string = "minimax/video-01"): Promise<VideoGenerationResult> {
        const startTime = Date.now();

        try {
            const input: Record<string, unknown> = {
                prompt: params.prompt,
                duration: params.duration,
            };

            if (params.keyframeUrl) {
                input.first_frame_image = params.keyframeUrl;
            }

            console.log(`[Replicate] Creating prediction for ${model}...`);
            const prediction = await this.replicate.predictions.create({
                version: model.includes("/") ? undefined : model, // If it's a model ID with version
                model: model.includes("/") ? model as any : undefined,
                input
            });

            console.log(`[Replicate] Prediction created: ${prediction.id}`);

            // Polling for completion
            let currentPrediction = prediction;
            const maxWait = 300000; // 5 minutes
            const pollInterval = 5000; // 5 seconds
            const startPoll = Date.now();

            while (
                currentPrediction.status !== "succeeded" &&
                currentPrediction.status !== "failed" &&
                currentPrediction.status !== "canceled" &&
                (Date.now() - startPoll) < maxWait
            ) {
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                currentPrediction = await this.replicate.predictions.get(prediction.id);
                console.log(`[Replicate] Prediction ${prediction.id} status: ${currentPrediction.status}`);
            }

            if (currentPrediction.status !== "succeeded") {
                throw new Error(`Video generation ${currentPrediction.status}: ${currentPrediction.error || "Timeout"}`);
            }

            const videoUrl = Array.isArray(currentPrediction.output) ? currentPrediction.output[0] : currentPrediction.output;

            // 1. Download
            const response = await fetch(videoUrl as string);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // 2. Upload to GCS
            const filename = `generated/video/${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
            const { url: gcsUrl } = await storagePut(filename, buffer, "video/mp4");
            console.log(`[Replicate] Video secured at: ${gcsUrl}`);

            const cost = this.calculateVideoCost(params.duration, params.resolution);

            // 3. Log Usage
            if (params.projectId && params.userId) {
                await logUsage(
                    params.projectId,
                    params.userId,
                    model,
                    cost,
                    "VIDEO_GEN",
                    1
                );
            }

            const [width, height] = this.parseResolution(params.resolution);

            return {
                provider: "replicate",
                model: model,
                url: gcsUrl,
                duration: params.duration,
                width,
                height,
                fps: params.fps,
                fileSize: buffer.length,
                actualCost: cost,
                processingTime: Date.now() - startTime,
                metadata: {
                    id: prediction.id,
                    status: currentPrediction.status,
                    raw_output: currentPrediction.output
                },
            };
        } catch (error: unknown) {
            console.error(`[Replicate] Video Generation Error:`, error.message || error);
            throw new Error(`Replicate video generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get prediction status
     */
    async getPredictionStatus(predictionId: string): Promise<any> {
        return await this.replicate.predictions.get(predictionId);
    }

    private mapResolutionToAspectRatio(resolution: string): string {
        const [w, h] = resolution.split("x").map(Number);
        if (!w || !h) return "1:1";

        const ratio = w / h;
        if (ratio > 1.5) return "16:9";
        if (ratio < 0.7) return "9:16";
        if (ratio > 1.1) return "3:2";
        if (ratio < 0.9) return "2:3";
        return "1:1";
    }

    private parseResolution(resolution: string): [number, number] {
        switch (resolution) {
            case "720p": return [1280, 720];
            case "1080p": return [1920, 1080];
            case "4k": return [3840, 2160];
            default: return [1280, 720];
        }
    }

    private calculateVideoCost(duration: number, resolution: string): number {
        const minutes = duration / 60;
        const baseCost = resolution === "4k" ? 0.3 : resolution === "1080p" ? 0.15 : 0.1;
        return baseCost * minutes;
    }
}
