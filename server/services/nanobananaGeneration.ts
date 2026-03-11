import { ENV } from "../_core/env";
import { GeminiProvider } from "./providers/geminiProvider";

const apiKey = ENV.forgeApiKey || "";
const geminiProvider = new GeminiProvider(apiKey);
const NANOBANANA_MODEL = "imagen-4.0-generate-001";

/**
 * Generate an image using Nanobanana Pro on Gemini
 */
export async function generateImageWithNanobanana(
  prompt: string,
  resolution: "1k" | "2k" | "4k" = "2k",
  _referenceImages?: string[]
): Promise<string> {
  try {
    // Mapping internal resolution request to supported types in ImageGenerationParams
    const resValue: "1024x1024" | "768x768" = resolution === "1k" ? "768x768" : "1024x1024";

    const result = await geminiProvider.generateImage({
      prompt,
      resolution: resValue,
      quality: resolution === "4k" ? "hd" : "standard",
    }, NANOBANANA_MODEL);

    return result.url;
  } catch (error) {
    console.error("Nanobanana (via Gemini) image generation error:", error);
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
