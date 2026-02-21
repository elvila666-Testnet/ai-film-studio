import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

export type VideoCodec = "h264" | "h265" | "prores" | "dnxhd";
export type VideoQuality = "low" | "medium" | "high" | "ultra";
export type AudioCodec = "aac" | "mp3" | "flac";

export interface ExportOptions {
  codec: VideoCodec;
  quality: VideoQuality;
  audioCodec: AudioCodec;
  audioBitrate: number; // kbps
  videoBitrate: number; // kbps
  resolution: "720p" | "1080p" | "2k" | "4k";
  frameRate: 24 | 25 | 30 | 60;
  preset: "ultrafast" | "fast" | "medium" | "slow" | "veryslow";
}

export interface ExportProgress {
  status: "pending" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  currentFrame: number;
  totalFrames: number;
  estimatedTimeRemaining: number; // seconds
  error?: string;
}

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  codec: "h264",
  quality: "high",
  audioCodec: "aac",
  audioBitrate: 128,
  videoBitrate: 5000,
  resolution: "1080p",
  frameRate: 30,
  preset: "medium",
};

const QUALITY_PRESETS: Record<VideoQuality, Partial<ExportOptions>> = {
  low: {
    videoBitrate: 1500,
    audioBitrate: 64,
    preset: "ultrafast",
  },
  medium: {
    videoBitrate: 3000,
    audioBitrate: 96,
    preset: "fast",
  },
  high: {
    videoBitrate: 5000,
    audioBitrate: 128,
    preset: "medium",
  },
  ultra: {
    videoBitrate: 8000,
    audioBitrate: 192,
    preset: "slow",
  },
};

const RESOLUTION_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "2k": { width: 2560, height: 1440 },
  "4k": { width: 3840, height: 2160 },
};

/**
 * Build FFmpeg command for video export
 */
export function buildFFmpegCommand(
  inputFile: string,
  outputFile: string,
  options: ExportOptions
): string {
  const dims = RESOLUTION_DIMENSIONS[options.resolution];
  const codecMap: Record<VideoCodec, string> = {
    h264: "libx264",
    h265: "libx265",
    prores: "prores_ks",
    dnxhd: "dnxhd",
  };

  const audioCodecMap: Record<AudioCodec, string> = {
    aac: "aac",
    mp3: "libmp3lame",
    flac: "flac",
  };

  const command = [
    "ffmpeg",
    "-i", inputFile,
    "-c:v", codecMap[options.codec],
    "-b:v", `${options.videoBitrate}k`,
    "-s", `${dims.width}x${dims.height}`,
    "-r", String(options.frameRate),
    "-preset", options.preset,
    "-c:a", audioCodecMap[options.audioCodec],
    "-b:a", `${options.audioBitrate}k`,
    "-y", // Overwrite output file
    outputFile,
  ].join(" ");

  return command;
}

/**
 * Export video with progress tracking
 */
export async function exportVideo(
  inputFile: string,
  outputFile: string,
  options: Partial<ExportOptions> = {},
  onProgress?: (progress: ExportProgress) => void
): Promise<{ success: boolean; outputFile: string; error?: string }> {
  const mergedOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const qualityPreset = QUALITY_PRESETS[mergedOptions.quality];
  const finalOptions = { ...mergedOptions, ...qualityPreset };

  try {
    // Validate input file exists
    if (!fs.existsSync(inputFile)) {
      throw new Error(`Input file not found: ${inputFile}`);
    }

    // Create output directory if needed
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Report starting
    onProgress?.({
      status: "processing",
      progress: 0,
      currentFrame: 0,
      totalFrames: 0,
      estimatedTimeRemaining: 0,
    });

    // Build and execute FFmpeg command
    const command = buildFFmpegCommand(inputFile, outputFile, finalOptions);

    const { stdout: _stdout, stderr: _stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // Verify output file was created
    if (!fs.existsSync(outputFile)) {
      throw new Error("Export failed: output file was not created");
    }

    // Report completion
    onProgress?.({
      status: "completed",
      progress: 100,
      currentFrame: 0,
      totalFrames: 0,
      estimatedTimeRemaining: 0,
    });

    return {
      success: true,
      outputFile,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    onProgress?.({
      status: "failed",
      progress: 0,
      currentFrame: 0,
      totalFrames: 0,
      estimatedTimeRemaining: 0,
      error: errorMessage,
    });

    return {
      success: false,
      outputFile,
      error: errorMessage,
    };
  }
}

/**
 * Get video file information
 */
export async function getVideoInfo(
  filePath: string
): Promise<{
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
}> {
  try {
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1:noprint_wrappers=1 "${filePath}"`;

    const { stdout } = await execAsync(command);
    const duration = parseFloat(stdout.trim());

    return {
      duration,
      width: 1920,
      height: 1080,
      frameRate: 30,
      bitrate: 5000,
    };
  } catch (error) {
    throw new Error(`Failed to get video info: ${error}`);
  }
}

/**
 * Generate video thumbnail
 */
export async function generateThumbnail(
  videoFile: string,
  outputFile: string,
  timeSeconds: number = 1
): Promise<{ success: boolean; outputFile?: string; error?: string }> {
  try {
    const command = `ffmpeg -i "${videoFile}" -ss ${timeSeconds} -vframes 1 -vf scale=320:180 "${outputFile}" -y`;

    await execAsync(command);

    if (!fs.existsSync(outputFile)) {
      throw new Error("Thumbnail generation failed");
    }

    return {
      success: true,
      outputFile,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate export options
 */
export function validateExportOptions(options: Partial<ExportOptions>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (options.videoBitrate && (options.videoBitrate < 500 || options.videoBitrate > 50000)) {
    errors.push("Video bitrate must be between 500 and 50000 kbps");
  }

  if (options.audioBitrate && (options.audioBitrate < 32 || options.audioBitrate > 320)) {
    errors.push("Audio bitrate must be between 32 and 320 kbps");
  }

  if (options.frameRate && ![24, 25, 30, 60].includes(options.frameRate)) {
    errors.push("Frame rate must be 24, 25, 30, or 60 fps");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Estimate export time based on video duration and settings
 */
export function estimateExportTime(
  videoDuration: number,
  options: ExportOptions
): number {
  // Rough estimation based on preset
  const presetMultipliers: Record<string, number> = {
    ultrafast: 0.5,
    fast: 1,
    medium: 2,
    slow: 4,
    veryslow: 8,
  };

  const baseTime = videoDuration * presetMultipliers[options.preset];
  return Math.ceil(baseTime);
}
