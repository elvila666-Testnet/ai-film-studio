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

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const { getActiveModelConfig } = await import("../db");
  const activeConfig = await getActiveModelConfig("image");

  let apiKey = ENV.forgeApiKey;
  let apiUrl = ENV.forgeApiUrl;
  let modelId = activeConfig?.modelId || "Nanobanana Pro";

  if (activeConfig) {
    if (activeConfig.apiKey) apiKey = activeConfig.apiKey;
    if (activeConfig.apiEndpoint) apiUrl = activeConfig.apiEndpoint;
  }

  if (!apiUrl) {
    throw new Error("Image service URL is not configured");
  }
  if (!apiKey) {
    throw new Error("Image service API key is not configured");
  }

  // Build the full URL
  const baseUrl = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;

  // Custom providers might use different endpoint structures. 
  // For built-in ImageService, we use the standard gRPC-Gateway path.
  const fullUrl = activeConfig?.apiEndpoint
    ? apiUrl
    : new URL("images.v1.ImageService/GenerateImage", baseUrl).toString();

  console.log(`[AI] Generating image with ${modelId} at ${fullUrl}...`);

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: options.prompt,
      model: modelId,
      original_images: options.originalImages || [],
    }),
  });


  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    image: {
      b64Json: string;
      mimeType: string;
    };
  };
  const base64Data = result.image.b64Json;
  const buffer = Buffer.from(base64Data, "base64");

  // Save to S3
  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    result.image.mimeType
  );
  return {
    url,
  };
}
