
import { ENV } from "../../_core/env";
import {
    ImageGenerationParams,
    ImageGenerationResult,
} from "./types";

/**
 * Apiyi Provider
 * Handles image generation via Apiyi's OpenAI-compatible API
 */
export class ApiyiProvider {
    private apiKey: string;
    private apiUrl: string;

    constructor(apiKey: string, apiUrl: string = "https://api.apiyi.com/v1") {
        this.apiKey = apiKey || ENV.apiyiApiKey || "";
        this.apiUrl = apiUrl;
    }

    /**
     * Generate an image using Apiyi
     */
    async generateImage(params: ImageGenerationParams, model: string = "mj-v6"): Promise<ImageGenerationResult> {
        const startTime = Date.now();

        if (!this.apiKey) {
            throw new Error("Apiyi API key is not configured");
        }

        try {
            const baseUrl = this.apiUrl.endsWith("/") ? this.apiUrl.slice(0, -1) : this.apiUrl;
            const url = `${baseUrl}/images/generations`;

            // Map resolution to size string expected by OpenAI API format
            const size = params.resolution;

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: model,
                    prompt: params.prompt,
                    n: params.count || 1,
                    size: size,
                    quality: params.quality === "hd" ? "hd" : "standard",
                    response_format: "url",
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Apiyi API error (${response.status}): ${errorText}`);
            }

            const data = await response.json();

            if (!data.data || data.data.length === 0 || !data.data[0].url) {
                throw new Error("Apiyi returned an empty or invalid response");
            }

            const imageUrl = data.data[0].url;
            const [width, height] = params.resolution.split("x").map(Number);

            return {
                provider: "apiyi",
                model: model,
                url: imageUrl,
                width: width || 1024,
                height: height || 1024,
                actualCost: 0.04, // Estimated cost, adjust as needed based on actual pricing
                processingTime: Date.now() - startTime,
                metadata: {
                    raw_output: data,
                },
            };
        } catch (error) {
            throw new Error(`Apiyi image generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
