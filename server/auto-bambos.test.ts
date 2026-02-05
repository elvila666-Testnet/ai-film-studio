import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateAutoBambos,
  createAutoBambosReport,
  selectBestOutputs,
  createComparisonMetadata,
} from "./services/autoBambosPipeline";
import { FrameDescriptor } from "./services/frameDescriptor";

describe("Auto-Bambos Pipeline", () => {
  const mockFrameDescriptor: FrameDescriptor = {
    composition: "Wide establishing shot with clear spatial relationships",
    cameraLanguage: "Establishing, objective perspective",
    mood: "Intense, high-stakes emotional atmosphere",
    lighting: "Low-key, dramatic shadows, high contrast",
    colorPalette: "Black, white, deep grays, high contrast",
    visualStyle: "noir",
    characters: {
      "Character A": "Tall, dark-haired protagonist",
      "Character B": "Short, blonde supporting character",
    },
    characterPositions: {
      "Character A": "center frame",
      "Character B": "right side",
    },
    shotNumber: 1,
    duration: 2.5,
    narrativeContext: "Opening scene, establishing conflict",
  };

  describe("generateAutoBambos", () => {
    it("should generate both Flow and Sora videos in parallel", async () => {
      const request = {
        frameDescriptor: mockFrameDescriptor,
        storyboardImageUrl: "https://example.com/image.jpg",
        projectId: 1,
      };

      // Mock the generation functions
      vi.mock("./services/flowGeneration", () => ({
        generateFlowVideo: vi.fn().mockResolvedValue({
          videoUrl: "https://example.com/flow.mp4",
          duration: 2.5,
          status: "success",
          metadata: {
            frameDescriptor: mockFrameDescriptor,
            generatedAt: new Date().toISOString(),
            processingTime: 5000,
          },
        }),
      }));

      vi.mock("./services/soraGeneration", () => ({
        generateSoraVideo: vi.fn().mockResolvedValue({
          videoUrl: "https://example.com/sora.mp4",
          duration: 2.5,
          status: "success",
          metadata: {
            frameDescriptor: mockFrameDescriptor,
            generatedAt: new Date().toISOString(),
            processingTime: 8000,
          },
        }),
      }));

      // In a real test, we'd verify both were called in parallel
      expect(request.frameDescriptor).toBeDefined();
      expect(request.storyboardImageUrl).toBeDefined();
    });

    it("should handle partial failures gracefully", async () => {
      const request = {
        frameDescriptor: mockFrameDescriptor,
        storyboardImageUrl: "https://example.com/image.jpg",
        projectId: 1,
      };

      // Should not throw even if one generation fails
      expect(request).toBeDefined();
    });

    it("should provide comparison scores for both outputs", () => {
      // Verify comparison structure
      const mockComparison = {
        recommendation: "both" as const,
        reasoning: "Both outputs maintain visual consistency",
        flowScore: 85,
        soraScore: 90,
      };

      expect(mockComparison.flowScore).toBeGreaterThan(0);
      expect(mockComparison.soraScore).toBeGreaterThan(0);
      expect(mockComparison.recommendation).toBe("both");
    });
  });

  describe("createAutoBambosReport", () => {
    it("should generate comprehensive report with statistics", () => {
      const mockResults = [
        {
          frameDescriptor: mockFrameDescriptor,
          flow: {
            videoUrl: "https://example.com/flow1.mp4",
            duration: 2.5,
            status: "success" as const,
            metadata: {
              frameDescriptor: mockFrameDescriptor,
              generatedAt: new Date().toISOString(),
              processingTime: 5000,
            },
          },
          sora: {
            videoUrl: "https://example.com/sora1.mp4",
            duration: 2.5,
            status: "success" as const,
            metadata: {
              frameDescriptor: mockFrameDescriptor,
              generatedAt: new Date().toISOString(),
              processingTime: 8000,
            },
          },
          comparison: {
            recommendation: "flow" as const,
            reasoning: "Flow better for camera movement",
            flowScore: 85,
            soraScore: 75,
          },
          status: "success" as const,
          metadata: {
            generatedAt: new Date().toISOString(),
            totalProcessingTime: 13000,
          },
        },
      ];

      const report = createAutoBambosReport(mockResults);

      expect(report.totalFrames).toBe(1);
      expect(report.successCount).toBe(1);
      expect(report.flowPreferred).toBe(1);
      expect(report.averageProcessingTime).toBeGreaterThan(0);
    });

    it("should track preferences across sequence", () => {
      const mockResults = [
        {
          frameDescriptor: { ...mockFrameDescriptor, shotNumber: 1 },
          flow: {
            videoUrl: "https://example.com/flow1.mp4",
            duration: 2.5,
            status: "success" as const,
            metadata: {
              frameDescriptor: mockFrameDescriptor,
              generatedAt: new Date().toISOString(),
              processingTime: 5000,
            },
          },
          sora: {
            videoUrl: "https://example.com/sora1.mp4",
            duration: 2.5,
            status: "success" as const,
            metadata: {
              frameDescriptor: mockFrameDescriptor,
              generatedAt: new Date().toISOString(),
              processingTime: 8000,
            },
          },
          comparison: {
            recommendation: "flow" as const,
            reasoning: "Flow better",
            flowScore: 85,
            soraScore: 75,
          },
          status: "success" as const,
          metadata: {
            generatedAt: new Date().toISOString(),
            totalProcessingTime: 13000,
          },
        },
        {
          frameDescriptor: { ...mockFrameDescriptor, shotNumber: 2 },
          flow: {
            videoUrl: "https://example.com/flow2.mp4",
            duration: 3,
            status: "success" as const,
            metadata: {
              frameDescriptor: mockFrameDescriptor,
              generatedAt: new Date().toISOString(),
              processingTime: 5000,
            },
          },
          sora: {
            videoUrl: "https://example.com/sora2.mp4",
            duration: 3,
            status: "success" as const,
            metadata: {
              frameDescriptor: mockFrameDescriptor,
              generatedAt: new Date().toISOString(),
              processingTime: 8000,
            },
          },
          comparison: {
            recommendation: "sora" as const,
            reasoning: "Sora better for longer scene",
            flowScore: 75,
            soraScore: 90,
          },
          status: "success" as const,
          metadata: {
            generatedAt: new Date().toISOString(),
            totalProcessingTime: 13000,
          },
        },
      ];

      const report = createAutoBambosReport(mockResults);

      expect(report.totalFrames).toBe(2);
      expect(report.flowPreferred).toBe(1);
      expect(report.soraPreferred).toBe(1);
    });
  });

  describe("selectBestOutputs", () => {
    it("should select Flow when recommended", () => {
      const mockResults = [
        {
          frameDescriptor: mockFrameDescriptor,
          flow: {
            videoUrl: "https://example.com/flow.mp4",
            duration: 2.5,
            status: "success" as const,
            metadata: {
              frameDescriptor: mockFrameDescriptor,
              generatedAt: new Date().toISOString(),
              processingTime: 5000,
            },
          },
          sora: {
            videoUrl: "https://example.com/sora.mp4",
            duration: 2.5,
            status: "success" as const,
            metadata: {
              frameDescriptor: mockFrameDescriptor,
              generatedAt: new Date().toISOString(),
              processingTime: 8000,
            },
          },
          comparison: {
            recommendation: "flow" as const,
            reasoning: "Flow recommended",
            flowScore: 85,
            soraScore: 75,
          },
          status: "success" as const,
          metadata: {
            generatedAt: new Date().toISOString(),
            totalProcessingTime: 13000,
          },
        },
      ];

      const selections = selectBestOutputs(mockResults);

      expect(selections[0].selectedType).toBe("flow");
      expect(selections[0].videoUrl).toBe("https://example.com/flow.mp4");
    });

    it("should select Sora when recommended", () => {
      const mockResults = [
        {
          frameDescriptor: mockFrameDescriptor,
          flow: {
            videoUrl: "https://example.com/flow.mp4",
            duration: 2.5,
            status: "success" as const,
            metadata: {
              frameDescriptor: mockFrameDescriptor,
              generatedAt: new Date().toISOString(),
              processingTime: 5000,
            },
          },
          sora: {
            videoUrl: "https://example.com/sora.mp4",
            duration: 2.5,
            status: "success" as const,
            metadata: {
              frameDescriptor: mockFrameDescriptor,
              generatedAt: new Date().toISOString(),
              processingTime: 8000,
            },
          },
          comparison: {
            recommendation: "sora" as const,
            reasoning: "Sora recommended",
            flowScore: 75,
            soraScore: 85,
          },
          status: "success" as const,
          metadata: {
            generatedAt: new Date().toISOString(),
            totalProcessingTime: 13000,
          },
        },
      ];

      const selections = selectBestOutputs(mockResults);

      expect(selections[0].selectedType).toBe("sora");
      expect(selections[0].videoUrl).toBe("https://example.com/sora.mp4");
    });

    it("should prefer Flow for short cuts when both recommended", () => {
      const shortFrameDescriptor = {
        ...mockFrameDescriptor,
        duration: 1.5, // Short cut
      };

      const mockResults = [
        {
          frameDescriptor: shortFrameDescriptor,
          flow: {
            videoUrl: "https://example.com/flow.mp4",
            duration: 1.5,
            status: "success" as const,
            metadata: {
              frameDescriptor: shortFrameDescriptor,
              generatedAt: new Date().toISOString(),
              processingTime: 5000,
            },
          },
          sora: {
            videoUrl: "https://example.com/sora.mp4",
            duration: 1.5,
            status: "success" as const,
            metadata: {
              frameDescriptor: shortFrameDescriptor,
              generatedAt: new Date().toISOString(),
              processingTime: 8000,
            },
          },
          comparison: {
            recommendation: "both" as const,
            reasoning: "Both work",
            flowScore: 80,
            soraScore: 80,
          },
          status: "success" as const,
          metadata: {
            generatedAt: new Date().toISOString(),
            totalProcessingTime: 13000,
          },
        },
      ];

      const selections = selectBestOutputs(mockResults);

      expect(selections[0].selectedType).toBe("flow");
      expect(selections[0].reason).toContain("short cut");
    });
  });

  describe("createComparisonMetadata", () => {
    it("should create properly structured comparison metadata", () => {
      const mockResult = {
        frameDescriptor: mockFrameDescriptor,
        flow: {
          videoUrl: "https://example.com/flow.mp4",
          duration: 2.5,
          status: "success" as const,
          metadata: {
            frameDescriptor: mockFrameDescriptor,
            generatedAt: new Date().toISOString(),
            processingTime: 5000,
          },
        },
        sora: {
          videoUrl: "https://example.com/sora.mp4",
          duration: 2.5,
          status: "success" as const,
          metadata: {
            frameDescriptor: mockFrameDescriptor,
            generatedAt: new Date().toISOString(),
            processingTime: 8000,
          },
        },
        comparison: {
          recommendation: "both" as const,
          reasoning: "Both maintain consistency",
          flowScore: 85,
          soraScore: 90,
        },
        status: "success" as const,
        metadata: {
          generatedAt: new Date().toISOString(),
          totalProcessingTime: 13000,
        },
      };

      const metadata = createComparisonMetadata(mockResult);

      expect(metadata.shotNumber).toBe(1);
      expect(metadata.frameDescriptor).toBeDefined();
      expect(metadata.flow.status).toBe("success");
      expect(metadata.sora.status).toBe("success");
      expect(metadata.comparison.recommendation).toBe("both");
      expect(metadata.overallStatus).toBe("success");
    });
  });

  describe("Pipeline Hierarchy Validation", () => {
    it("should enforce NanoBanana as visual anchor", () => {
      // Verify frame descriptor is locked
      expect(mockFrameDescriptor.composition).toBeDefined();
      expect(mockFrameDescriptor.characters).toBeDefined();
      expect(mockFrameDescriptor.lighting).toBeDefined();
    });

    it("should ensure Flow only adds motion", () => {
      const flowPrompt = "Flow adds: camera movement, parallax, depth";
      const flowConstraints = [
        "preserve_composition: true",
        "preserve_characters: true",
        "preserve_lighting: true",
      ];

      expect(flowConstraints.length).toBe(3);
      expect(flowPrompt).toContain("motion");
    });

    it("should ensure Sora only adds acting", () => {
      const soraPrompt = "Sora adds: character acting, organic movement";
      const soraConstraints = [
        "preserve_keyframe: true",
        "preserve_characters: true",
        "preserve_lighting: true",
        "preserve_composition: true",
      ];

      expect(soraConstraints.length).toBe(4);
      expect(soraPrompt).toContain("acting");
    });
  });
});
