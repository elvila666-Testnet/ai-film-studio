/**
 * Image generation helper using internal ImageService
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 *
 * For editing:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "Add a rainbow to this landscape",
 *     originalImages: [{
 *       url: "https://example.com/original.jpg",
 *       mimeType: "image/jpeg"
 *     }]
 *   });
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";
import { ReplicateProvider } from "../services/providers/replicateProvider";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

/**
 * Core image generation utility - now powered by Replicate (Img2Img support)
 */
export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const replicateProvider = new ReplicateProvider(process.env.REPLICATE_API_TOKEN || "");
  
  console.log(`[Core AI] Generating image via Replicate (Anchors: ${options.originalImages?.length || 0})`);

  const imageInputs = options.originalImages?.map(img => img.url).filter(Boolean) as string[];

  const result = await replicateProvider.generateImage({
    prompt: options.prompt,
    resolution: "1024x1024",
    quality: "hd",
    imageInputs: imageInputs.length > 0 ? imageInputs : undefined,
  }, "flux-pro");

  // Replicate returns a GCS-ready URL already in our pipeline, but we ensure persistence
  const response = await fetch(result.url);
  const buffer = Buffer.from(await response.arrayBuffer());

  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    "image/png"
  );

  return { url };
}
