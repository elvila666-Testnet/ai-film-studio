import * as ffmpegService from './ffmpegService';

/**
 * Configuration for thumbnail generation
 */
export const DEFAULT_THUMBNAIL_CONFIG = {
  width: 160,
  height: 90,
  quality: 85,
  format: 'jpeg' as const,
};

export const PREVIEW_FRAME_CONFIG = {
  width: 320,
  height: 180,
  quality: 85,
  format: 'jpeg' as const,
};

/**
 * Generate frame timestamps evenly distributed across video duration
 */
export function generateFrameTimestamps(duration: number, frameCount: number): number[] {
  if (frameCount <= 0 || duration <= 0) return [];

  const timestamps: number[] = [];
  const interval = duration / (frameCount + 1);

  for (let i = 1; i <= frameCount; i++) {
    const timestamp = interval * i;
    // Round to 1 decimal place
    timestamps.push(Math.round(timestamp * 10) / 10);
  }

  return timestamps;
}

/**
 * Calculate optimal dimensions maintaining aspect ratio
 */
export function calculateOptimalDimensions(
  videoWidth: number,
  videoHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const videoAspect = videoWidth / videoHeight;
  const maxAspect = maxWidth / maxHeight;

  let width: number, height: number;

  if (videoAspect > maxAspect) {
    // Video is wider
    width = maxWidth;
    height = Math.round(maxWidth / videoAspect);
  } else {
    // Video is taller
    height = maxHeight;
    width = Math.round(maxHeight * videoAspect);
  }

  return { width, height };
}

/**
 * Generate thumbnail filename
 */
export function generateThumbnailFilename(videoId: number, timestamp: number, format: string): string {
  const frameNum = Math.round(timestamp * 10);
  return `video-${videoId}-frame-${frameNum}.${format}`;
}

/**
 * Get cache key for thumbnail
 */
export function getThumbnailCacheKey(videoId: number, timestamp: number): string {
  const frameNum = Math.round(timestamp * 10);
  return `thumbnail:${videoId}:${frameNum}`;
}

/**
 * Validate video file
 */
export function validateVideoFile(
  filename: string,
  fileSize: number
): { valid: boolean; error?: string } {
  const validExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'mts', 'm2ts'];
  const ext = filename.split('.').pop()?.toLowerCase();

  if (!ext || !validExtensions.includes(ext)) {
    return { valid: false, error: `Invalid video format: ${ext}` };
  }

  const maxSize = 2000 * 1024 * 1024; // 2GB
  if (fileSize > maxSize) {
    return { valid: false, error: `File size exceeds maximum limit (2GB)` };
  }

  return { valid: true };
}

/**
 * Estimate generation time in minutes
 */
export function estimateGenerationTime(_duration: number, frameCount: number): number {
  // Rough estimate: ~0.5 seconds per frame + 1 second overhead
  const estimatedSeconds = frameCount * 0.5 + 1;
  return Math.ceil(estimatedSeconds / 60);
}

/**
 * Format thumbnail metadata for display
 */
export function formatThumbnailMetadata(result: {
  thumbnailUrl: string;
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  previewFrames: Array<{ timestamp: number; url: string; width: number; height: number; fileSize: number }>;
}): string {
  const sizeMB = (result.fileSize / (1024 * 1024)).toFixed(2);
  const frameCount = result.previewFrames.length;
  return `${result.width}x${result.height} • ${result.duration}s • ${frameCount} frames • ${sizeMB}MB`;
}

/**
 * Generate single thumbnail at specific timestamp
 */
export async function generateThumbnail(videoUrl: string, timestamp: number): Promise<string> {
  try {
    // Download video to temp file
    const videoPath = await ffmpegService.downloadVideoToTemp(videoUrl);

    // Extract frame
    const result = await ffmpegService.extractFrame(videoPath, {
      timestamp,
      ...DEFAULT_THUMBNAIL_CONFIG,
    });

    return result.frameUrl;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    throw error;
  }
}

/**
 * Generate thumbnail set (multiple preview frames)
 */
export async function generateThumbnailSet(
  videoUrl: string,
  duration: number,
  frameCount: number = 6
): Promise<{
  thumbnailUrl: string;
  previewFrames: Array<{ timestamp: number; url: string; width: number; height: number; fileSize: number }>;
}> {
  try {
    // Download video to temp file
    const videoPath = await ffmpegService.downloadVideoToTemp(videoUrl);

    // Generate frame timestamps
    const timestamps = generateFrameTimestamps(duration, frameCount);

    // Extract frames
    const frames = await ffmpegService.extractMultipleFrames(videoPath, timestamps, PREVIEW_FRAME_CONFIG);

    // Use first frame as main thumbnail
    const thumbnailUrl = frames.length > 0 ? frames[0].frameUrl : '';

    // Format preview frames
    const previewFrames = frames.map((frame) => ({
      timestamp: frame.timestamp,
      url: frame.frameUrl,
      width: frame.width,
      height: frame.height,
      fileSize: frame.fileSize,
    }));

    return {
      thumbnailUrl,
      previewFrames,
    };
  } catch (error) {
    console.error('Thumbnail set generation failed:', error);
    throw error;
  }
}

/**
 * Generate preview grid (contact sheet)
 */
export async function generatePreviewGrid(videoUrl: string): Promise<string> {
  try {
    // Download video to temp file
    const videoPath = await ffmpegService.downloadVideoToTemp(videoUrl);

    // Generate contact sheet
    const gridUrl = await ffmpegService.generateContactSheet(videoPath, 6);

    return gridUrl;
  } catch (error) {
    console.error('Preview grid generation failed:', error);
    throw error;
  }
}

/**
 * Extract video metadata
 */
export async function extractMetadata(videoUrl: string): Promise<{
  metadata: {
    duration: number;
    width: number;
    height: number;
    fps: number;
    codec: string;
    bitrate: number;
  };
}> {
  try {
    // Download video to temp file
    const videoPath = await ffmpegService.downloadVideoToTemp(videoUrl);

    // Extract metadata
    const metadata = await ffmpegService.extractVideoMetadata(videoPath);

    return { metadata };
  } catch (error) {
    console.error('Metadata extraction failed:', error);
    throw error;
  }
}

/**
 * Create animated preview (GIF)
 */
export async function createAnimatedPreview(videoUrl: string, duration: number = 3): Promise<string> {
  try {
    // Download video to temp file
    const videoPath = await ffmpegService.downloadVideoToTemp(videoUrl);

    // Create animated preview
    const previewUrl = await ffmpegService.createAnimatedPreview(videoPath, duration);

    return previewUrl;
  } catch (error) {
    console.error('Animated preview creation failed:', error);
    throw error;
  }
}

/**
 * Cleanup temporary files
 */
export function cleanup(): void {
  ffmpegService.cleanupTempVideos();
  ffmpegService.cleanupTempFrames();
}
