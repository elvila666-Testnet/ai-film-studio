import * as fs from 'fs';
import * as path from 'path';
import { storagePut } from '../storage';

/**
 * Fallback service for when FFmpeg is unavailable or fails
 */

/**
 * Generate placeholder thumbnail when FFmpeg fails
 */
export async function generatePlaceholderThumbnail(
  videoUrl: string,
  width: number = 320,
  height: number = 180
): Promise<string> {
  try {
    // Create a simple colored placeholder image (1x1 pixel, can be scaled)
    const placeholderBuffer = createPlaceholderImage(width, height);

    // Upload to S3
    const key = `thumbnails/placeholder_${Date.now()}.jpeg`;
    const { url } = await storagePut(key, placeholderBuffer, 'image/jpeg');

    return url;
  } catch (error) {
    console.error('Placeholder thumbnail generation failed:', error);
    throw error;
  }
}

/**
 * Create placeholder image buffer (simple gradient)
 */
function createPlaceholderImage(width: number, height: number): Buffer {
  // Create a simple JPEG placeholder (1x1 pixel that can be scaled)
  // This is a minimal valid JPEG file
  const jpegHeader = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d, 0x01, 0x02, 0x03, 0x00,
    0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32,
    0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35,
    0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55,
    0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94,
    0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2,
    0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
    0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6,
    0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda,
    0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xfb, 0xd0, 0xff, 0xd9,
  ]);

  return jpegHeader;
}

/**
 * Check if FFmpeg is available
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    await execAsync('ffmpeg -version', { timeout: 5000 });
    return true;
  } catch (error) {
    console.warn('FFmpeg not available:', error);
    return false;
  }
}

/**
 * Generate error response with fallback
 */
export function generateErrorResponse(error: Error, fallbackUrl?: string) {
  return {
    success: false,
    error: error.message,
    fallbackUrl,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < maxRetries - 1) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Timeout wrapper for operations
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Validate video URL
 */
export function isValidVideoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const validProtocols = ['http', 'https', 's3'];
    return validProtocols.includes(urlObj.protocol.replace(':', ''));
  } catch {
    return false;
  }
}

/**
 * Get video file extension from URL
 */
export function getVideoExtension(videoUrl: string): string | null {
  try {
    const urlObj = new URL(videoUrl);
    const pathname = urlObj.pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();

    const validExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'mts', 'm2ts'];
    return ext && validExtensions.includes(ext) ? ext : null;
  } catch {
    return null;
  }
}

/**
 * Log FFmpeg error with context
 */
export function logFFmpegError(
  context: string,
  error: Error,
  videoUrl?: string,
  errorTimestamp?: number
): void {
  console.error(`[FFmpeg Error] ${context}`, {
    message: error.message,
    videoUrl,
    errorTimestamp,
    stack: error.stack,
    logTimestamp: new Date().toISOString(),
  });
}

/**
 * Create error recovery strategy
 */
export async function recoverFromError(
  error: Error,
  videoUrl: string,
  fallbackGenerator?: () => Promise<string>
): Promise<string | null> {
  logFFmpegError('Recovery attempt', error, videoUrl);

  // Try fallback generator if provided
  if (fallbackGenerator) {
    try {
      return await fallbackGenerator();
    } catch (fallbackError) {
      console.error('Fallback generation failed:', fallbackError);
    }
  }

  // Generate placeholder as last resort
  try {
    return await generatePlaceholderThumbnail(videoUrl);
  } catch (placeholderError) {
    console.error('Placeholder generation failed:', placeholderError);
    return null;
  }
}
