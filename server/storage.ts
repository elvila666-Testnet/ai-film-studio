import { uploadFileToGCS, getGCSFileUrl } from "./services/storageService";

/**
 * Uploads data (Buffer, Uint8Array or Base64 string) to the configured storage backend (Google Cloud Storage).
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  // We ignore relKey completely and let GCS service generate a UUID so naming is robust
  const { key, url } = await uploadFileToGCS(data, contentType, relKey.split('/')[0] || 'uploads');
  return { key, url };
}

/**
 * Gets a file's public URL from the configured storage backend (Google Cloud Storage).
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const url = await getGCSFileUrl(relKey);
  return {
    key: relKey,
    url,
  };
}
