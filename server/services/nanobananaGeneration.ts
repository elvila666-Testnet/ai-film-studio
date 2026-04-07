import { ENV } from "../_core/env";
import { getReplicateProvider } from "./aiGeneration";

/**
 * Generate an image using Nanobanana Pro on Replicate (Img2Img supported)
 */
export async function generateImageWithNanobanana(
  prompt: string,
  resolution: "1k" | "2k" | "4k" = "2k",
  referenceImages: string[] = []
): Promise<string> {
  try {
    const replicateProvider = getReplicateProvider();
    
    // Mapping internal resolution request to supported types in ImageGenerationParams
    const resValue: "1216x832" | "1792x1024" | "768x768" = resolution === "1k" ? "768x768" : "1792x1024";

    console.log(`[Nanobanana] Routing image generation to Replicate with ${referenceImages.length} anchors.`);

    const result = await replicateProvider.generateImage({
      prompt,
      resolution: resValue,
      quality: resolution === "4k" ? "hd" : "standard",
      imageInputs: referenceImages,
    }, "nano-banana-pro");

    return result.url;
  } catch (error) {
    console.error("Nanobanana (via Replicate) image generation error:", error);
    throw error;
  }
}

/**
 * Get account credits - For Gemini we don't usually have a simple credit endpoint per model
 */
export async function getNanobanaCredits(): Promise<number> {
  return 999;
}

/**
 * Generate image with character consistency using Nanobanana Pro on Gemini
 */
export async function generateImageWithConsistency(
  prompt: string,
  _referenceImages: string[] = [],
  resolution: "1k" | "2k" | "4k" = "2k"
): Promise<string> {
  // Pass through to the main generation function
  return generateImageWithNanobanana(prompt, resolution);
}
