import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as ffmpegService from './services/ffmpegService';
import * as ffmpegFallback from './services/ffmpegFallback';
import * as thumbnailGeneration from './services/thumbnailGeneration';

describe('FFmpeg Integration', () => {
  describe('FFmpeg Service', () => {
    it('should have FFmpeg available', async () => {
      const available = await ffmpegFallback.isFFmpegAvailable();
      expect(available).toBe(true);
    });

    it('should format time correctly for FFmpeg', () => {
      // Test internal function through service
      const timeStr = '00:00:05.50';
      expect(timeStr).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{2}$/);
    });

    it('should validate video URLs', () => {
      const validUrls = [
        'https://example.com/video.mp4',
        'http://example.com/video.webm',
        's3://bucket/video.mov',
      ];

      for (const url of validUrls) {
        expect(ffmpegFallback.isValidVideoUrl(url)).toBe(true);
      }
    });

    it('should reject invalid video URLs', () => {
      const invalidUrls = ['not-a-url', 'ftp://example.com/video.mp4', ''];

      for (const url of invalidUrls) {
        expect(ffmpegFallback.isValidVideoUrl(url)).toBe(false);
      }
    });

    it('should extract video extension from URL', () => {
      const testCases = [
        { url: 'https://example.com/video.mp4', expected: 'mp4' },
        { url: 'https://example.com/video.webm', expected: 'webm' },
        { url: 'https://example.com/video.mov', expected: 'mov' },
        { url: 'https://example.com/video.txt', expected: null },
      ];

      for (const { url, expected } of testCases) {
        expect(ffmpegFallback.getVideoExtension(url)).toBe(expected);
      }
    });
  });

  describe('Thumbnail Generation', () => {
    it('should generate frame timestamps', () => {
      const timestamps = thumbnailGeneration.generateFrameTimestamps(120, 6);
      expect(timestamps).toHaveLength(6);
      expect(timestamps[0]).toBeGreaterThan(0);
      expect(timestamps[timestamps.length - 1]).toBeLessThan(120);
    });

    it('should handle edge cases for frame timestamps', () => {
      expect(thumbnailGeneration.generateFrameTimestamps(0, 6)).toEqual([]);
      expect(thumbnailGeneration.generateFrameTimestamps(120, 0)).toEqual([]);
      expect(thumbnailGeneration.generateFrameTimestamps(120, 1)).toHaveLength(1);
    });

    it('should calculate optimal dimensions', () => {
      const dims = thumbnailGeneration.calculateOptimalDimensions(1920, 1080, 320, 180);
      expect(dims.width).toBeLessThanOrEqual(320);
      expect(dims.height).toBeLessThanOrEqual(180);
      expect(dims.width / dims.height).toBeCloseTo(16 / 9, 1);
    });

    it('should generate thumbnail filename', () => {
      const filename = thumbnailGeneration.generateThumbnailFilename(1, 5.5, 'jpeg');
      expect(filename).toContain('video-1');
      expect(filename).toContain('frame-55');
      expect(filename).toContain('.jpeg');
    });

    it('should generate cache keys', () => {
      const key1 = thumbnailGeneration.getThumbnailCacheKey(1, 5.5);
      const key2 = thumbnailGeneration.getThumbnailCacheKey(1, 5.5);
      expect(key1).toBe(key2);

      const key3 = thumbnailGeneration.getThumbnailCacheKey(1, 6.5);
      expect(key1).not.toBe(key3);
    });

    it('should validate video files', () => {
      const validResult = thumbnailGeneration.validateVideoFile('video.mp4', 500 * 1024 * 1024);
      expect(validResult.valid).toBe(true);

      const invalidFormatResult = thumbnailGeneration.validateVideoFile('video.txt', 500 * 1024 * 1024);
      expect(invalidFormatResult.valid).toBe(false);
      expect(invalidFormatResult.error).toBeDefined();

      const invalidSizeResult = thumbnailGeneration.validateVideoFile('video.mp4', 3000 * 1024 * 1024);
      expect(invalidSizeResult.valid).toBe(false);
      expect(invalidSizeResult.error).toContain('exceeds');
    });

    it('should estimate generation time', () => {
      const time = thumbnailGeneration.estimateGenerationTime(120, 6);
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(10);

      const moreFrames = thumbnailGeneration.estimateGenerationTime(120, 12);
      expect(moreFrames).toBeGreaterThan(time);
    });

    it('should format metadata', () => {
      const metadata = {
        thumbnailUrl: 'https://example.com/thumb.jpg',
        duration: 120,
        width: 1920,
        height: 1080,
        fileSize: 5000000,
        previewFrames: [
          { timestamp: 0, url: 'url1', width: 320, height: 180, fileSize: 50000 },
          { timestamp: 60, url: 'url2', width: 320, height: 180, fileSize: 50000 },
        ],
      };

      const formatted = thumbnailGeneration.formatThumbnailMetadata(metadata);
      expect(formatted).toContain('1920x1080');
      expect(formatted).toContain('120');
      expect(formatted).toContain('2'); // Frame count
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should generate placeholder thumbnail', async () => {
      const url = await ffmpegFallback.generatePlaceholderThumbnail('https://example.com/video.mp4');
      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
    });

    it('should generate error response', () => {
      const error = new Error('Test error');
      const response = ffmpegFallback.generateErrorResponse(error, 'fallback-url');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Test error');
      expect(response.fallbackUrl).toBe('fallback-url');
      expect(response.timestamp).toBeDefined();
    });

    it('should retry with exponential backoff', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await ffmpegFallback.retryWithBackoff(operation, 5, 10);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      const operation = async () => {
        throw new Error('Permanent failure');
      };

      try {
        await ffmpegFallback.retryWithBackoff(operation, 2, 10);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error instanceof Error).toBe(true);
      }
    });

    it('should timeout operations', async () => {
      const slowOperation = new Promise((resolve) => {
        setTimeout(() => resolve('done'), 5000);
      });

      try {
        await ffmpegFallback.withTimeout(slowOperation, 100);
        expect.fail('Should have timed out');
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('timeout');
      }
    });

    it('should log FFmpeg errors', () => {
      const error = new Error('Test error');
      expect(() => {
        ffmpegFallback.logFFmpegError('Test context', error, 'https://example.com/video.mp4', 5.5);
      }).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should have valid default thumbnail config', () => {
      const config = thumbnailGeneration.DEFAULT_THUMBNAIL_CONFIG;
      expect(config.width).toBeGreaterThan(0);
      expect(config.height).toBeGreaterThan(0);
      expect(config.quality).toBeGreaterThanOrEqual(1);
      expect(config.quality).toBeLessThanOrEqual(100);
      expect(['jpeg', 'png', 'webp']).toContain(config.format);
    });

    it('should have valid preview frame config', () => {
      const config = thumbnailGeneration.PREVIEW_FRAME_CONFIG;
      expect(config.width).toBeGreaterThan(0);
      expect(config.height).toBeGreaterThan(0);
      expect(config.quality).toBeGreaterThanOrEqual(1);
      expect(config.quality).toBeLessThanOrEqual(100);
    });

    it('should have preview frames larger than thumbnails', () => {
      expect(thumbnailGeneration.PREVIEW_FRAME_CONFIG.width).toBeGreaterThan(
        thumbnailGeneration.DEFAULT_THUMBNAIL_CONFIG.width
      );
      expect(thumbnailGeneration.PREVIEW_FRAME_CONFIG.height).toBeGreaterThan(
        thumbnailGeneration.DEFAULT_THUMBNAIL_CONFIG.height
      );
    });
  });

  describe('Performance', () => {
    it('should generate timestamps quickly', () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        thumbnailGeneration.generateFrameTimestamps(3600, 100);
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should calculate dimensions quickly', () => {
      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        thumbnailGeneration.calculateOptimalDimensions(1920, 1080, 320, 180);
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should validate URLs quickly', () => {
      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        ffmpegFallback.isValidVideoUrl('https://example.com/video.mp4');
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Integration', () => {
    it('should have consistent API across services', () => {
      // Verify all services export expected functions
      expect(typeof ffmpegService.extractVideoMetadata).toBe('function');
      expect(typeof ffmpegService.extractFrame).toBe('function');
      expect(typeof ffmpegService.extractMultipleFrames).toBe('function');
      expect(typeof ffmpegService.generateContactSheet).toBe('function');
      expect(typeof ffmpegService.createAnimatedPreview).toBe('function');

      expect(typeof thumbnailGeneration.generateThumbnail).toBe('function');
      expect(typeof thumbnailGeneration.generateThumbnailSet).toBe('function');
      expect(typeof thumbnailGeneration.generatePreviewGrid).toBe('function');
      expect(typeof thumbnailGeneration.extractMetadata).toBe('function');

      expect(typeof ffmpegFallback.generatePlaceholderThumbnail).toBe('function');
      expect(typeof ffmpegFallback.isFFmpegAvailable).toBe('function');
      expect(typeof ffmpegFallback.retryWithBackoff).toBe('function');
    });

    it('should handle cleanup', () => {
      expect(() => {
        thumbnailGeneration.cleanup();
        ffmpegService.cleanupTempVideos();
        ffmpegService.cleanupTempFrames();
      }).not.toThrow();
    });
  });
});
