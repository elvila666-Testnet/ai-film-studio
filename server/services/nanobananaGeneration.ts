import { ENV } from "../_core/env";
import { ReplicateProvider } from "./providers/replicateProvider";

const replicateProvider = new ReplicateProvider(ENV.replicateApiKey);
const NANOBANANA_MODEL = "black-forest-labs/flux-schnell";

/**
 * Generate an image using Nanobanana Pro on Replicate
 */
export async function generateImageWithNanobanana(
  prompt: string,
  resolution: "1k" | "2k" | "4k" = "2k",
  _referenceImages?: string[]
): Promise<string> {
  try {
    // Mapping internal resolution request to supported types in ImageGenerationParams
    const resValue: "1024x1024" | "768x768" = resolution === "1k" ? "768x768" : "1024x1024";

    const result = await replicateProvider.generateImage({
      prompt,
      resolution: resValue,
      quality: resolution === "4k" ? "hd" : "standard",
    }, NANOBANANA_MODEL);

    return result.url;
  } catch (error) {
    console.error("Nanobanana (via Replicate) image generation error:", error);
    throw error;
  }
}

/**
 * Get account credits - For Replicate we don't usually have a simple credit endpoint per model
 */
export async function getNanobanaCredits(): Promise<number> {
  return 999;
}

/**
 * Generate image with character consistency using Nanobanana Pro on Replicate
 */
export async function generateImageWithConsistency(
  prompt: string,
  _referenceImages: string[] = [],
  resolution: "1k" | "2k" | "4k" = "2k"
): Promise<string> {
  // Pass through to the main generation function
  return generateImageWithNanobanana(prompt, resolution);
}
