import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { storagePut } from '../storage';

const execAsync = promisify(exec);

/**
 * FFmpeg service for video processing and frame extraction
 */

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
  format: string;
}

export interface FrameExtractionOptions {
  timestamp: number;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface ThumbnailGenerationResult {
  frameUrl: string;
  width: number;
  height: number;
  fileSize: number;
  timestamp: number;
  format: string;
}

/**
 * Extract video metadata using FFmpeg
 */
export async function extractVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  try {
    const command = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,codec_name,bit_rate -show_entries format=duration -of default=noprint_wrappers=1:nokey=1:noprint_wrappers=1 "${videoPath}"`;

    const { stdout } = await execAsync(command);
    const lines = stdout.trim().split('\n');

    // Parse FFprobe output
    const width = parseInt(lines[0]) || 1920;
    const height = parseInt(lines[1]) || 1080;
    const fpsStr = lines[2] || '30/1';
    const [fpsNum, fpsDen] = fpsStr.split('/').map(Number);
    const fps = fpsNum / (fpsDen || 1);
    const codec = lines[3] || 'h264';
    const bitrate = parseInt(lines[4]) || 5000000;
    const duration = parseFloat(lines[5]) || 0;

    return {
      duration,
      width,
      height,
      fps: Math.round(fps * 100) / 100,
      codec,
      bitrate,
      format: 'mp4',
    };
  } catch (error) {
    console.error('Failed to extract video metadata:', error);
    throw new Error(`Failed to extract video metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract a single frame from video at specified timestamp
 */
export async function extractFrame(
  videoPath: string,
  options: FrameExtractionOptions
): Promise<ThumbnailGenerationResult> {
  const { timestamp, width = 320, height = 180, quality = 85, format = 'jpeg' } = options;

  // Validate timestamp
  if (timestamp < 0) {
    throw new Error('Timestamp must be non-negative');
  }

  const tempDir = '/tmp/ai_film_studio_frames';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const frameFile = path.join(tempDir, `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${format}`);

  try {
    // Build FFmpeg command for frame extraction
    const ffmpegCmd = buildFrameExtractionCommand(videoPath, frameFile, timestamp, width, height, quality, format);

    // Execute FFmpeg
    await execAsync(ffmpegCmd, { timeout: 30000 });

    // Verify file was created
    if (!fs.existsSync(frameFile)) {
      throw new Error('Frame extraction failed: output file not created');
    }

    // Read frame file
    const frameBuffer = fs.readFileSync(frameFile);
    const fileSize = frameBuffer.length;

    // Upload to S3
    const frameKey = `thumbnails/frame_${Date.now()}_${timestamp.toFixed(2)}.${format}`;
    const { url } = await storagePut(frameKey, frameBuffer, `image/${format}`);

    // Clean up temp file
    fs.unlinkSync(frameFile);

    return {
      frameUrl: url,
      width,
      height,
      fileSize,
      timestamp,
      format,
    };
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(frameFile)) {
      fs.unlinkSync(frameFile);
    }

    console.error('Frame extraction error:', error);
    throw new Error(`Failed to extract frame: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract multiple frames from video at specified intervals
 */
export async function extractMultipleFrames(
  videoPath: string,
  timestamps: number[],
  options?: Partial<FrameExtractionOptions>
): Promise<ThumbnailGenerationResult[]> {
  const results: ThumbnailGenerationResult[] = [];

  for (const timestamp of timestamps) {
    try {
      const result = await extractFrame(videoPath, {
        timestamp,
        ...options,
      });
      results.push(result);
    } catch (error) {
      console.error(`Failed to extract frame at ${timestamp}:`, error);
      // Continue with next frame instead of failing entire operation
    }
  }

  return results;
}

/**
 * Generate contact sheet (grid of frames)
 */
export async function generateContactSheet(
  videoPath: string,
  frameCount: number = 6,
  options?: Partial<FrameExtractionOptions>
): Promise<string> {
  try {
    // Get video metadata
    const metadata = await extractVideoMetadata(videoPath);
    const interval = metadata.duration / (frameCount + 1);

    // Generate timestamps
    const timestamps = Array.from({ length: frameCount }, (_, i) => (i + 1) * interval);

    // Extract frames
    const _frames = await extractMultipleFrames(videoPath, timestamps, options);
    void _frames;

    // Create contact sheet using FFmpeg
    const tempDir = '/tmp/ai_film_studio_frames';
    const contactSheetFile = path.join(tempDir, `contact_sheet_${Date.now()}.jpg`);

    // Build FFmpeg filter for contact sheet
    const filterComplex = buildContactSheetFilter(frameCount, 6, 3); // 6 columns, 3 rows

    const ffmpegCmd = `ffmpeg -i "${videoPath}" -vf "${filterComplex}" -y "${contactSheetFile}"`;

    await execAsync(ffmpegCmd, { timeout: 60000 });

    // Upload to S3
    const sheetBuffer = fs.readFileSync(contactSheetFile);
    const sheetKey = `thumbnails/contact_sheet_${Date.now()}.jpg`;
    const { url } = await storagePut(sheetKey, sheetBuffer, 'image/jpeg');

    // Clean up
    fs.unlinkSync(contactSheetFile);

    return url;
  } catch (error) {
    console.error('Contact sheet generation error:', error);
    throw new Error(`Failed to generate contact sheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create animated preview (GIF or WebP animation)
 */
export async function createAnimatedPreview(
  videoPath: string,
  duration: number = 3,
  fps: number = 10,
  width: number = 320,
  height: number = 180
): Promise<string> {
  const tempDir = '/tmp/ai_film_studio_frames';
  const outputFile = path.join(tempDir, `preview_${Date.now()}.gif`);

  try {
    // Build FFmpeg command for animated GIF
    const ffmpegCmd = `ffmpeg -i "${videoPath}" -t ${duration} -vf "fps=${fps},scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2" -y "${outputFile}"`;

    await execAsync(ffmpegCmd, { timeout: 60000 });

    // Upload to S3
    const previewBuffer = fs.readFileSync(outputFile);
    const previewKey = `thumbnails/preview_${Date.now()}.gif`;
    const { url } = await storagePut(previewKey, previewBuffer, 'image/gif');

    // Clean up
    fs.unlinkSync(outputFile);

    return url;
  } catch (error) {
    console.error('Animated preview generation error:', error);
    throw new Error(`Failed to create animated preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get video duration
 */
export async function getVideoDuration(videoPath: string): Promise<number> {
  try {
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1:noprint_wrappers=1 "${videoPath}"`;
    const { stdout } = await execAsync(command);
    return parseFloat(stdout.trim()) || 0;
  } catch (error) {
    console.error('Failed to get video duration:', error);
    throw new Error(`Failed to get video duration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate video file
 */
export async function validateVideoFile(videoPath: string): Promise<boolean> {
  try {
    const command = `ffmpeg -v error -select_streams v:0 -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 -f null - < "${videoPath}"`;
    await execAsync(command, { timeout: 10000 });
    return true;
  } catch (error) {
    console.error('Video validation failed:', error);
    return false;
  }
}

/**
 * Build FFmpeg frame extraction command
 */
function buildFrameExtractionCommand(
  videoPath: string,
  outputFile: string,
  timestamp: number,
  width: number,
  height: number,
  quality: number,
  format: string
): string {
  const timeStr = formatFFmpegTime(timestamp);

  // Build scale filter to maintain aspect ratio
  const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;

  // Build quality settings based on format
  let qualitySettings = '';
  if (format === 'jpeg') {
    qualitySettings = `-q:v ${Math.max(1, Math.min(31, Math.round((100 - quality) / 3.2)))}`;
  } else if (format === 'png') {
    qualitySettings = `-compression_level ${Math.max(0, Math.min(9, Math.round(quality / 11.1)))}`;
  } else if (format === 'webp') {
    qualitySettings = `-q:v ${quality}`;
  }

  return `ffmpeg -ss ${timeStr} -i "${videoPath}" -vf "${scaleFilter}" -vframes 1 ${qualitySettings} -y "${outputFile}"`;
}

/**
 * Build FFmpeg filter for contact sheet
 */
function buildContactSheetFilter(frameCount: number, cols: number, rows: number): string {
  // Generate FPS to extract correct number of frames
  const fps = frameCount / 10; // Assuming 10 second video for contact sheet

  // Build tile filter
  return `fps=${fps},scale=320:180,tile=${cols}x${rows}`;
}

/**
 * Format time for FFmpeg (HH:MM:SS.MS)
 */
function formatFFmpegTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Download video from URL to temporary file
 */
export async function downloadVideoToTemp(videoUrl: string): Promise<string> {
  const tempDir = '/tmp/ai_film_studio_videos';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFile = path.join(tempDir, `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`);

  try {
    // Use curl to download
    const command = `curl -L -o "${tempFile}" "${videoUrl}" --max-time 300`;
    await execAsync(command, { timeout: 310000 });

    if (!fs.existsSync(tempFile)) {
      throw new Error('Download failed: file not created');
    }

    return tempFile;
  } catch (error) {
    console.error('Video download error:', error);
    throw new Error(`Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean up temporary video files
 */
export function cleanupTempVideos(): void {
  const tempDir = '/tmp/ai_film_studio_videos';
  if (fs.existsSync(tempDir)) {
    try {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

/**
 * Clean up temporary frame files
 */
export function cleanupTempFrames(): void {
  const tempDir = '/tmp/ai_film_studio_frames';
  if (fs.existsSync(tempDir)) {
    try {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}
