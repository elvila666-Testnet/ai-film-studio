import { describe, it, expect, beforeEach } from 'vitest';
import * as aiAutomation from './services/aiAutomation';

describe('AI Automation Features', () => {
  describe('Scene Detection', () => {
    it('should detect scenes in video', () => {
      const scenes = aiAutomation.detectScenes('test-video.mp4');
      expect(scenes).toBeDefined();
      expect(scenes.length).toBeGreaterThan(0);
      expect(scenes[0]).toHaveProperty('sceneNumber');
      expect(scenes[0]).toHaveProperty('startTime');
      expect(scenes[0]).toHaveProperty('endTime');
      expect(scenes[0]).toHaveProperty('confidence');
    });

    it('should filter scenes by confidence threshold', () => {
      const scenes = aiAutomation.detectScenes('test-video.mp4', 0.9);
      expect(scenes.every((s) => s.confidence >= 0.9)).toBe(true);
    });

    it('should include keyframes in scene data', () => {
      const scenes = aiAutomation.detectScenes('test-video.mp4');
      expect(scenes[0].keyframes).toBeDefined();
      expect(Array.isArray(scenes[0].keyframes)).toBe(true);
    });
  });

  describe('Subtitle Generation', () => {
    it('should generate subtitles from video', () => {
      const subtitles = aiAutomation.generateSubtitles('test-video.mp4');
      expect(subtitles).toBeDefined();
      expect(subtitles.length).toBeGreaterThan(0);
      expect(subtitles[0]).toHaveProperty('startTime');
      expect(subtitles[0]).toHaveProperty('endTime');
      expect(subtitles[0]).toHaveProperty('text');
      expect(subtitles[0]).toHaveProperty('confidence');
    });

    it('should support multiple languages', () => {
      const subtitles = aiAutomation.generateSubtitles('test-video.mp4', 'es');
      expect(subtitles[0].language).toBe('es');
    });

    it('should maintain subtitle timing order', () => {
      const subtitles = aiAutomation.generateSubtitles('test-video.mp4');
      for (let i = 0; i < subtitles.length - 1; i++) {
        expect(subtitles[i].startTime).toBeLessThanOrEqual(subtitles[i + 1].startTime);
      }
    });
  });

  describe('Color Grading', () => {
    it('should suggest color grading profile', () => {
      const profile = aiAutomation.suggestColorGradingProfile('test-video.mp4');
      expect(profile).toHaveProperty('name');
      expect(profile).toHaveProperty('brightness');
      expect(profile).toHaveProperty('contrast');
      expect(profile).toHaveProperty('saturation');
    });

    it('should apply color grading profile', () => {
      const profile = aiAutomation.suggestColorGradingProfile('test-video.mp4');
      const result = aiAutomation.applyColorGrading('test-video.mp4', profile);
      expect(result.success).toBe(true);
      expect(result.outputUrl).toBeDefined();
    });

    it('should validate color grading values', () => {
      const profile = aiAutomation.suggestColorGradingProfile('test-video.mp4');
      expect(profile.brightness).toBeGreaterThanOrEqual(-100);
      expect(profile.brightness).toBeLessThanOrEqual(100);
      expect(profile.contrast).toBeGreaterThanOrEqual(-100);
      expect(profile.contrast).toBeLessThanOrEqual(100);
    });
  });

  describe('Clip Recommendations', () => {
    it('should generate clip recommendations', () => {
      const recommendations = aiAutomation.getClipRecommendations(1, [1, 2, 3]);
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('clipId');
      expect(recommendations[0]).toHaveProperty('score');
      expect(recommendations[0]).toHaveProperty('confidence');
    });

    it('should rank recommendations by score', () => {
      const recommendations = aiAutomation.getClipRecommendations(1, [1, 2, 3]);
      for (let i = 0; i < recommendations.length - 1; i++) {
        expect(recommendations[i].score).toBeGreaterThanOrEqual(recommendations[i + 1].score);
      }
    });

    it('should include suggested position', () => {
      const recommendations = aiAutomation.getClipRecommendations(1, [1, 2, 3]);
      expect(recommendations[0].suggestedPosition).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Transitions', () => {
    it('should generate transitions between clips', () => {
      const transitions = aiAutomation.generateTransitions([1, 2, 3]);
      expect(transitions.length).toBe(2);
      expect(transitions[0].fromClip).toBe(1);
      expect(transitions[0].toClip).toBe(2);
    });

    it('should support different transition types', () => {
      const types: Array<'fade' | 'dissolve' | 'wipe' | 'slide'> = [
        'fade',
        'dissolve',
        'wipe',
        'slide',
      ];
      for (const type of types) {
        const transitions = aiAutomation.generateTransitions([1, 2], type);
        expect(transitions[0].type).toBe(type);
      }
    });

    it('should set default transition duration', () => {
      const transitions = aiAutomation.generateTransitions([1, 2]);
      expect(transitions[0].duration).toBe(0.5);
    });
  });

  describe('Video Quality Analysis', () => {
    it('should analyze video quality', () => {
      const analysis = aiAutomation.analyzeVideoQuality('test-video.mp4');
      expect(analysis).toHaveProperty('resolution');
      expect(analysis).toHaveProperty('frameRate');
      expect(analysis).toHaveProperty('bitrate');
      expect(analysis).toHaveProperty('quality');
    });

    it('should provide quality recommendations', () => {
      const analysis = aiAutomation.analyzeVideoQuality('test-video.mp4');
      expect(analysis.recommendations).toBeDefined();
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    it('should return valid quality score', () => {
      const analysis = aiAutomation.analyzeVideoQuality('test-video.mp4');
      expect(analysis.quality).toBeGreaterThanOrEqual(0);
      expect(analysis.quality).toBeLessThanOrEqual(100);
    });
  });

  describe('Video Summary', () => {
    it('should generate video summary', () => {
      const summary = aiAutomation.generateVideoSummary('test-video.mp4');
      expect(summary).toHaveProperty('title');
      expect(summary).toHaveProperty('description');
      expect(summary).toHaveProperty('keyPoints');
      expect(summary).toHaveProperty('duration');
      expect(summary).toHaveProperty('suggestedTags');
    });

    it('should include key points', () => {
      const summary = aiAutomation.generateVideoSummary('test-video.mp4');
      expect(Array.isArray(summary.keyPoints)).toBe(true);
      expect(summary.keyPoints.length).toBeGreaterThan(0);
    });

    it('should suggest relevant tags', () => {
      const summary = aiAutomation.generateVideoSummary('test-video.mp4');
      expect(Array.isArray(summary.suggestedTags)).toBe(true);
    });
  });

  describe('Auto Enhancement', () => {
    it('should auto-enhance video', () => {
      const result = aiAutomation.autoEnhanceVideo('test-video.mp4');
      expect(result.success).toBe(true);
      expect(result.outputUrl).toBeDefined();
      expect(result.enhancements).toBeDefined();
    });

    it('should list applied enhancements', () => {
      const result = aiAutomation.autoEnhanceVideo('test-video.mp4');
      expect(Array.isArray(result.enhancements)).toBe(true);
      expect(result.enhancements.length).toBeGreaterThan(0);
    });
  });

  describe('Face and Emotion Detection', () => {
    it('should detect faces and emotions', () => {
      const detections = aiAutomation.detectFacesAndEmotions('test-video.mp4');
      expect(detections).toBeDefined();
      expect(detections.length).toBeGreaterThan(0);
      expect(detections[0]).toHaveProperty('timestamp');
      expect(detections[0]).toHaveProperty('faceCount');
      expect(detections[0]).toHaveProperty('emotions');
    });

    it('should track emotion scores', () => {
      const detections = aiAutomation.detectFacesAndEmotions('test-video.mp4');
      const emotions = detections[0].emotions;
      const total = Object.values(emotions).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 1); // Should sum to ~1
    });
  });

  describe('Caption Generation', () => {
    it('should generate captions with speaker identification', () => {
      const captions = aiAutomation.generateCaptions('test-video.mp4');
      expect(captions).toBeDefined();
      expect(captions.length).toBeGreaterThan(0);
      expect(captions[0]).toHaveProperty('speaker');
      expect(captions[0]).toHaveProperty('text');
    });

    it('should include timing information', () => {
      const captions = aiAutomation.generateCaptions('test-video.mp4');
      expect(captions[0].startTime).toBeLessThan(captions[0].endTime);
    });
  });

  describe('Audio Detection', () => {
    it('should detect audio elements', () => {
      const elements = aiAutomation.detectAudioElements('test-video.mp4');
      expect(elements).toBeDefined();
      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0]).toHaveProperty('type');
      expect(elements[0]).toHaveProperty('confidence');
    });

    it('should categorize audio types', () => {
      const elements = aiAutomation.detectAudioElements('test-video.mp4');
      const types = new Set(elements.map((e) => e.type));
      expect(types.size).toBeGreaterThan(0);
    });

    it('should include confidence scores', () => {
      const elements = aiAutomation.detectAudioElements('test-video.mp4');
      expect(elements[0].confidence).toBeGreaterThan(0);
      expect(elements[0].confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Automation Status', () => {
    it('should return automation feature status', () => {
      const status = aiAutomation.getAutomationStatus(1);
      expect(status).toHaveProperty('sceneDetection');
      expect(status).toHaveProperty('subtitleGeneration');
      expect(status).toHaveProperty('colorGrading');
      expect(status).toHaveProperty('clipRecommendations');
    });

    it('should indicate enabled features', () => {
      const status = aiAutomation.getAutomationStatus(1);
      expect(typeof status.sceneDetection).toBe('boolean');
      expect(typeof status.subtitleGeneration).toBe('boolean');
    });
  });
});
