import { storagePut } from "../storage";
import { v4 as uuidv4 } from "uuid";

/**
 * Uploads a Base64 image string (Data URI) to the storage proxy
 * Returns the public URL of the uploaded object
 */
export async function uploadBase64Image(base64Data: string, folder: string = "generations"): Promise<string> {
    try {
        // 1. Parse the Data URI
        const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            // If it's already a URL, just return it
            if (base64Data.startsWith('http')) return base64Data;
            throw new Error("Invalid base64 data format");
        }

        const contentType = matches[1];
        const base64String = matches[2];
        const buffer = Buffer.from(base64String, 'base64');

        // 2. Generate unique filename
        const extension = contentType.split('/')[1] || 'jpg';
        const fileName = `${folder}/${uuidv4()}.${extension}`;

        // 3. Upload using the storagePut proxy
        console.log(`[GCS Proxy] Uploading ${fileName}...`);
        const { url } = await storagePut(fileName, buffer, contentType);

        return url;
    } catch (error: any) {
        console.error("[GCS Proxy] Upload failed:", error.message);
        throw new Error(`Failed to upload image to GCS: ${error.message}`);
    }
}
