import { Storage } from "@google-cloud/storage";
import { ENV } from "../_core/env";
import { v4 as uuidv4 } from "uuid";

// Initialize GCS client
const storage = new Storage({
    projectId: ENV.gcpProjectId || undefined,
});

export const getBucket = () => {
    if (!ENV.gcsBucketName) {
        throw new Error("GCS_BUCKET_NAME is not configured");
    }
    return storage.bucket(ENV.gcsBucketName);
};

/**
 * Uploads a file (Buffer, Uint8Array, or Base64 string) to Google Cloud Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFileToGCS(
    data: Buffer | Uint8Array | string,
    contentType = "application/octet-stream",
    folder = "uploads"
): Promise<{ key: string; url: string }> {
    const bucket = getBucket();
    const fileId = uuidv4();

    // Create an extension from contentType if possible
    let ext = "";
    if (contentType.includes("image/png")) ext = ".png";
    else if (contentType.includes("image/jpeg")) ext = ".jpg";
    else if (contentType.includes("image/webp")) ext = ".webp";
    else if (contentType.includes("video/mp4")) ext = ".mp4";

    const key = `${folder}/${fileId}${ext}`;
    const file = bucket.file(key);

    let buffer: Buffer;

    // Handle base64 string
    if (typeof data === "string") {
        // Check if it's a data URI
        const matches = data.match(/^data:([A-Za-z-+\\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            contentType = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
        } else {
            // Just raw base64 or string
            buffer = Buffer.from(data, 'base64');
        }
    } else {
        // It's a Buffer or Uint8Array
        buffer = Buffer.from(data);
    }

    await file.save(buffer, {
        metadata: {
            contentType,
        },
    }).catch(err => {
        console.error(`[storageService] GCS Save Error for ${key}:`, err);
        console.error(`[storageService] Bucket: ${ENV.gcsBucketName}, Project: ${ENV.gcpProjectId}`);
        throw err;
    });

    const url = `https://storage.googleapis.com/${ENV.gcsBucketName}/${key}`;
    console.log(`[storageService] Upload successful: ${url}`);
    return { key, url };
}

/**
 * Uploads an external temporary URL (like Replicate's) to Google Cloud Storage.
 * Fetches the URL to a buffer, then uploads it.
 */
export async function uploadExternalUrlToGCS(
    externalUrl: string,
    folder = "uploads"
): Promise<{ key: string; url: string }> {
    const response = await fetch(externalUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch external URL for proxying: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    return uploadFileToGCS(buffer, contentType, folder);
}

/**
 * Get a file's public URL from GCS
 */
export async function getGCSFileUrl(relKey: string): Promise<string> {
    if (relKey.startsWith("http")) return relKey; // Already a URL
    // Just return the public URL formulation
    return `https://storage.googleapis.com/${ENV.gcsBucketName}/${relKey}`;
}
