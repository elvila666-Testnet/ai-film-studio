import { exec } from "child_process";
import { promisify } from "util";
import { mkdir, unlink } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const execAsync = promisify(exec);

class VideoEditorService {
  private tempDir: string;
  private outputDir: string;

  constructor() {
    this.tempDir = path.join("/tmp", "video-editor");
    this.outputDir = path.join("/tmp", "video-output");
  }

  async initialize() {
    await mkdir(this.tempDir, { recursive: true });
    await mkdir(this.outputDir, { recursive: true });
  }

  /**
   * Download file from URL to local temp directory
   */
  async downloadFile(url: string, filename: string): Promise<string> {
    // Ensure temp directory exists
    await this.initialize();
    
    const outputPath = path.join(this.tempDir, filename);
    try {
      await execAsync(`curl -L -o "${outputPath}" "${url}"`);
      return outputPath;
    } catch (error) {
      console.error(`Failed to download file from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Compose multiple video clips with transitions
   */
  async composeClips(
    clips: Array<{ path: string; duration: number; transition?: string }>,
    outputResolution: string = "1920x1080",
    fps: number = 24
  ): Promise<string> {
    const sessionId = uuidv4();
    const filterComplex: string[] = [];
    const inputFiles: string[] = [];

    try {
      // Add all input files
      for (const clip of clips) {
        inputFiles.push(`-i "${clip.path}"`);
      }

      // Build filter complex for composition
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        filterComplex.push(
          `[${i}:v]scale=${outputResolution}:force_original_aspect_ratio=decrease[v${i}]`
        );
      }

      const concatInputs = Array.from({ length: clips.length }, (_, i) => `[v${i}]`).join("");
      filterComplex.push(`${concatInputs}concat=n=${clips.length}:v=1:a=0[v]`);

      const outputPath = path.join(this.outputDir, `composed_${sessionId}.mp4`);

      const ffmpegCmd =
        `ffmpeg ${inputFiles.join(" ")} -filter_complex "${filterComplex.join(";")}" ` +
        `-map "[v]" -c:v libx264 -preset medium -crf 23 -r ${fps} "${outputPath}" -y`;

      await execAsync(ffmpegCmd);
      return outputPath;
    } catch (error) {
      console.error("Failed to compose clips:", error);
      throw error;
    }
  }

  /**
   * Add watermark to video
   */
  async addWatermark(
    videoPath: string,
    watermarkPath: string,
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right" = "bottom-right"
  ): Promise<string> {
    const sessionId = uuidv4();
    const positionMap = {
      "top-left": "10:10",
      "top-right": "main_w-overlay_w-10:10",
      "bottom-left": "10:main_h-overlay_h-10",
      "bottom-right": "main_w-overlay_w-10:main_h-overlay_h-10",
    };

    try {
      const outputPath = path.join(this.outputDir, `watermarked_${sessionId}.mp4`);
      await execAsync(
        `ffmpeg -i "${videoPath}" -i "${watermarkPath}" -filter_complex "[0:v][1:v]overlay=${positionMap[position]}" -c:a copy "${outputPath}" -y`
      );
      return outputPath;
    } catch (error) {
      console.error("Failed to add watermark:", error);
      throw error;
    }
  }

  /**
   * Create animatic from image URLs (each image displayed for specified duration)
   * Optionally include audio track
   */
  async createAnimatic(
    imageUrls: string[],
    durationPerFrame: number = 2,
    fps: number = 24,
    resolution: string = "1920x1080",
    audioUrl?: string,
    audioVolume: number = 100,
    frameDurations?: Record<number, number>
  ): Promise<string> {
    if (imageUrls.length === 0) {
      throw new Error("No images provided for animatic");
    }

    const sessionId = uuidv4();
    const filterComplex: string[] = [];
    const inputFiles: string[] = [];
    const localImagePaths: string[] = [];

    try {
      // Ensure directories exist
      await this.initialize();
      console.log(`[Animatic] Starting export for ${imageUrls.length} frames`);

      // Download all images locally
      for (let i = 0; i < imageUrls.length; i++) {
        try {
          const localPath = await this.downloadFile(imageUrls[i], `frame_${sessionId}_${i}.png`);
          localImagePaths.push(localPath);
          inputFiles.push(`-i "${localPath}"`);
          console.log(`[Animatic] Downloaded frame ${i + 1}/${imageUrls.length}`);
        } catch (downloadError) {
          console.error(`[Animatic] Failed to download frame ${i + 1}:`, downloadError);
          throw new Error(`Failed to download frame ${i + 1}`);
        }
      }

      // Create filter complex to convert each image to video and concatenate
      const [width, height] = resolution.split("x").map(Number);

      // For each image, scale it and loop it for the specified duration
      const videoSegments: string[] = [];
      for (let i = 0; i < localImagePaths.length; i++) {
        const duration = frameDurations?.[i + 1] ?? durationPerFrame;
        const frameCount = Math.ceil(duration * fps);

        // Scale image to resolution and loop for duration
        filterComplex.push(
          `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,fps=${fps}[v${i}]`
        );
        // Create a video from the image by looping it
        filterComplex.push(`[v${i}]loop=loop=${frameCount}:size=${frameCount}[v${i}loop]`);
        videoSegments.push(`[v${i}loop]`);
      }

      // Concatenate all video segments
      const concatFilter =
        videoSegments.join("") + `concat=n=${localImagePaths.length}:v=1:a=0[v]`;
      filterComplex.push(concatFilter);

      const outputPath = path.join(this.outputDir, `animatic_${sessionId}.mp4`);
      let ffmpegCmd = `ffmpeg ${inputFiles.join(" ")}`;

      // Add audio if provided
      if (audioUrl) {
        const audioPath = await this.downloadFile(audioUrl, `audio_${sessionId}.mp3`);
        ffmpegCmd += ` -i "${audioPath}"`;

        // Apply volume adjustment if not 100%
        const volumeFilter = audioVolume !== 100 ? `,volume=${audioVolume / 100}` : "";
        filterComplex.push(`[${localImagePaths.length}:a]${volumeFilter}[a]`);
        ffmpegCmd += ` -filter_complex "${filterComplex.join(
          ";"
        )}" -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k -r ${fps} "${outputPath}" -y`;
      } else {
        ffmpegCmd += ` -filter_complex "${filterComplex.join(
          ";"
        )}" -map "[v]" -c:v libx264 -preset medium -crf 23 -r ${fps} "${outputPath}" -y`;
      }

      await execAsync(ffmpegCmd);

      // Clean up temp files
      for (const file of localImagePaths) {
        await unlink(file).catch(() => {});
      }

      // Clean up audio file if it was downloaded
      if (audioUrl) {
        await unlink(path.join(this.tempDir, `audio_${sessionId}.mp3`)).catch(() => {});
      }

      return outputPath;
    } catch (error) {
      console.error("Failed to create animatic:", error);
      throw error;
    }
  }

  /**
   * Clean up temp files
   */
  async cleanup() {
    try {
      await execAsync(`rm -rf ${this.tempDir} ${this.outputDir}`);
    } catch (error) {
      console.error("Failed to cleanup temp files:", error);
    }
  }
}

export const videoEditorService = new VideoEditorService();
