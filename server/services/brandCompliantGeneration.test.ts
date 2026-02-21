import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateBrandAlignedScript,
  refineBrandAlignedScript,
  generateBrandAlignedVisualStyle,
  refineBrandAlignedVisualStyle,
  generateBrandAlignedStoryboardPrompt,
  generateBrandAlignedVoiceover,
} from "./brandCompliantGeneration";
import { BrandGuidelines } from "./brandBrain";

// Mock the Brand Brain service
vi.mock("./brandBrain", () => ({
  analyzeContentCompliance: vi.fn(),
  generateBrandAlignedContent: vi.fn(),
  extractBrandMetrics: vi.fn(),
}));

import {
  analyzeContentCompliance,
  generateBrandAlignedContent,
  extractBrandMetrics,
} from "./brandBrain";

const mockBrand: BrandGuidelines = {
  id: 1,
  name: "TechCorp",
  targetCustomer: "Tech professionals",
  aesthetic: "Minimalist",
  mission: "Empower businesses",
  coreMessaging: "Innovation and reliability",
};

describe("Brand-Compliant Content Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateBrandAlignedScript", () => {
    it("should generate script with brand compliance analysis", async () => {
      const mockContent = "INT. OFFICE - DAY\nA tech professional works...";
      const mockCompliance = {
        isCompliant: true,
        score: {
          overall: 85,
          targetCustomerAlignment: 90,
          aestheticAlignment: 80,
          missionAlignment: 85,
          messagingAlignment: 80,
          issues: [],
          recommendations: [],
        },
        summary: "Script aligns well with brand",
        suggestions: [],
      };
      const mockMetrics = {
        overall: 85,
        targetCustomerAlignment: 90,
        aestheticAlignment: 80,
        missionAlignment: 85,
        messagingAlignment: 80,
      };

      vi.mocked(generateBrandAlignedContent).mockResolvedValue(mockContent);
      vi.mocked(analyzeContentCompliance).mockResolvedValue(mockCompliance);
      vi.mocked(extractBrandMetrics).mockResolvedValue(mockMetrics);

      const result = await generateBrandAlignedScript(
        mockBrand,
        "A tech company story"
      );

      expect(result.content).toBe(mockContent);
      expect(result.compliance.isCompliant).toBe(true);
      expect(result.metrics.overall).toBe(85);
      expect(vi.mocked(generateBrandAlignedContent)).toHaveBeenCalledWith(
        mockBrand,
        "script",
        expect.stringContaining("brief")
      );
    });

    it("should handle generation errors", async () => {
      vi.mocked(generateBrandAlignedContent).mockRejectedValue(
        new Error("LLM error")
      );

      await expect(
        generateBrandAlignedScript(mockBrand, "A brief")
      ).rejects.toThrow("LLM error");
    });
  });

  describe("refineBrandAlignedScript", () => {
    it("should refine script while maintaining brand alignment", async () => {
      const originalScript = "INT. OFFICE - DAY\nOriginal content";
      const refinedScript = "INT. OFFICE - DAY\nRefined content";
      const mockCompliance = {
        isCompliant: true,
        score: {
          overall: 90,
          targetCustomerAlignment: 92,
          aestheticAlignment: 88,
          missionAlignment: 90,
          messagingAlignment: 88,
          issues: [],
          recommendations: [],
        },
        summary: "Refined script is excellent",
        suggestions: [],
      };
      const mockMetrics = {
        overall: 90,
        targetCustomerAlignment: 92,
        aestheticAlignment: 88,
        missionAlignment: 90,
        messagingAlignment: 88,
      };

      vi.mocked(generateBrandAlignedContent).mockResolvedValue(refinedScript);
      vi.mocked(analyzeContentCompliance).mockResolvedValue(mockCompliance);
      vi.mocked(extractBrandMetrics).mockResolvedValue(mockMetrics);

      const result = await refineBrandAlignedScript(
        mockBrand,
        originalScript,
        "Make it more professional"
      );

      expect(result.content).toBe(refinedScript);
      expect(result.compliance.score.overall).toBe(90);
      expect(vi.mocked(generateBrandAlignedContent)).toHaveBeenCalledWith(
        mockBrand,
        "script",
        expect.stringContaining("refine")
      );
    });
  });

  describe("generateBrandAlignedVisualStyle", () => {
    it("should generate visual style with brand compliance", async () => {
      const mockVisualStyle =
        "Minimalist aesthetic with blue and white palette";
      const mockCompliance = {
        isCompliant: true,
        score: {
          overall: 88,
          targetCustomerAlignment: 85,
          aestheticAlignment: 95,
          missionAlignment: 85,
          messagingAlignment: 85,
          issues: [],
          recommendations: [],
        },
        summary: "Visual style perfectly matches brand aesthetic",
        suggestions: [],
      };
      const mockMetrics = {
        overall: 88,
        targetCustomerAlignment: 85,
        aestheticAlignment: 95,
        missionAlignment: 85,
        messagingAlignment: 85,
      };

      vi.mocked(generateBrandAlignedContent).mockResolvedValue(mockVisualStyle);
      vi.mocked(analyzeContentCompliance).mockResolvedValue(mockCompliance);
      vi.mocked(extractBrandMetrics).mockResolvedValue(mockMetrics);

      const result = await generateBrandAlignedVisualStyle(
        mockBrand,
        "INT. OFFICE - DAY"
      );

      expect(result.content).toBe(mockVisualStyle);
      expect(result.compliance.score.aestheticAlignment).toBe(95);
      expect(vi.mocked(generateBrandAlignedContent)).toHaveBeenCalledWith(
        mockBrand,
        "visual",
        expect.stringContaining("visual style")
      );
    });
  });

  describe("refineBrandAlignedVisualStyle", () => {
    it("should refine visual style while maintaining brand alignment", async () => {
      const originalStyle = "Minimalist aesthetic";
      const refinedStyle = "Minimalist aesthetic with enhanced contrast";
      const mockCompliance = {
        isCompliant: true,
        score: {
          overall: 92,
          targetCustomerAlignment: 90,
          aestheticAlignment: 98,
          missionAlignment: 90,
          messagingAlignment: 90,
          issues: [],
          recommendations: [],
        },
        summary: "Refined visual style is excellent",
        suggestions: [],
      };
      const mockMetrics = {
        overall: 92,
        targetCustomerAlignment: 90,
        aestheticAlignment: 98,
        missionAlignment: 90,
        messagingAlignment: 90,
      };

      vi.mocked(generateBrandAlignedContent).mockResolvedValue(refinedStyle);
      vi.mocked(analyzeContentCompliance).mockResolvedValue(mockCompliance);
      vi.mocked(extractBrandMetrics).mockResolvedValue(mockMetrics);

      const result = await refineBrandAlignedVisualStyle(
        mockBrand,
        originalStyle,
        "Increase contrast"
      );

      expect(result.content).toBe(refinedStyle);
      expect(result.compliance.score.aestheticAlignment).toBe(98);
    });
  });

  describe("generateBrandAlignedStoryboardPrompt", () => {
    it("should generate storyboard prompt with brand alignment", async () => {
      const mockStoryboard = "Shot 1: Wide establishing shot...";
      const mockCompliance = {
        isCompliant: true,
        score: {
          overall: 86,
          targetCustomerAlignment: 85,
          aestheticAlignment: 90,
          missionAlignment: 85,
          messagingAlignment: 83,
          issues: [],
          recommendations: [],
        },
        summary: "Storyboard aligns with brand",
        suggestions: [],
      };
      const mockMetrics = {
        overall: 86,
        targetCustomerAlignment: 85,
        aestheticAlignment: 90,
        missionAlignment: 85,
        messagingAlignment: 83,
      };

      vi.mocked(generateBrandAlignedContent).mockResolvedValue(mockStoryboard);
      vi.mocked(analyzeContentCompliance).mockResolvedValue(mockCompliance);
      vi.mocked(extractBrandMetrics).mockResolvedValue(mockMetrics);

      const result = await generateBrandAlignedStoryboardPrompt(
        mockBrand,
        "INT. OFFICE",
        "Minimalist aesthetic"
      );

      expect(result.content).toBe(mockStoryboard);
      expect(result.compliance.isCompliant).toBe(true);
      expect(vi.mocked(generateBrandAlignedContent)).toHaveBeenCalledWith(
        mockBrand,
        "storyboard",
        expect.stringContaining("storyboard")
      );
    });
  });

  describe("generateBrandAlignedVoiceover", () => {
    it("should generate voiceover with brand voice alignment", async () => {
      const mockVoiceover =
        "In a world of innovation, TechCorp leads the way...";
      const mockCompliance = {
        isCompliant: true,
        score: {
          overall: 87,
          targetCustomerAlignment: 88,
          aestheticAlignment: 85,
          missionAlignment: 90,
          messagingAlignment: 85,
          issues: [],
          recommendations: [],
        },
        summary: "Voiceover captures brand voice perfectly",
        suggestions: [],
      };
      const mockMetrics = {
        overall: 87,
        targetCustomerAlignment: 88,
        aestheticAlignment: 85,
        missionAlignment: 90,
        messagingAlignment: 85,
      };

      vi.mocked(generateBrandAlignedContent).mockResolvedValue(mockVoiceover);
      vi.mocked(analyzeContentCompliance).mockResolvedValue(mockCompliance);
      vi.mocked(extractBrandMetrics).mockResolvedValue(mockMetrics);

      const result = await generateBrandAlignedVoiceover(
        mockBrand,
        "INT. OFFICE",
        "Professional and inspiring"
      );

      expect(result.content).toBe(mockVoiceover);
      expect(result.compliance.score.missionAlignment).toBe(90);
      expect(vi.mocked(generateBrandAlignedContent)).toHaveBeenCalledWith(
        mockBrand,
        "voiceover",
        expect.stringContaining("voiceover")
      );
    });
  });

  describe("Return type validation", () => {
    it("should return BrandCompliantContent with all required fields", async () => {
      const mockCompliance = {
        isCompliant: true,
        score: {
          overall: 85,
          targetCustomerAlignment: 85,
          aestheticAlignment: 85,
          missionAlignment: 85,
          messagingAlignment: 85,
          issues: [],
          recommendations: [],
        },
        summary: "Good",
        suggestions: [],
      };

      vi.mocked(generateBrandAlignedContent).mockResolvedValue("Content");
      vi.mocked(analyzeContentCompliance).mockResolvedValue(mockCompliance);
      vi.mocked(extractBrandMetrics).mockResolvedValue({
        overall: 85,
        targetCustomerAlignment: 85,
        aestheticAlignment: 85,
        missionAlignment: 85,
        messagingAlignment: 85,
      });

      const result = await generateBrandAlignedScript(mockBrand, "Brief");

      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("compliance");
      expect(result).toHaveProperty("metrics");
      expect(typeof result.content).toBe("string");
      expect(result.compliance).toHaveProperty("isCompliant");
      expect(result.compliance).toHaveProperty("score");
      expect(result.compliance).toHaveProperty("summary");
      expect(result.metrics).toHaveProperty("overall");
    });
  });

  describe("Brand guidelines handling", () => {
    it("should handle brands with partial information", async () => {
      const partialBrand: BrandGuidelines = {
        id: 2,
        name: "SimpleBrand",
        targetCustomer: "Everyone",
      };

      vi.mocked(generateBrandAlignedContent).mockResolvedValue("Content");
      vi.mocked(analyzeContentCompliance).mockResolvedValue({
        isCompliant: true,
        score: {
          overall: 80,
          targetCustomerAlignment: 80,
          aestheticAlignment: 80,
          missionAlignment: 80,
          messagingAlignment: 80,
          issues: [],
          recommendations: [],
        },
        summary: "Good",
        suggestions: [],
      });
      vi.mocked(extractBrandMetrics).mockResolvedValue({
        overall: 80,
        targetCustomerAlignment: 80,
        aestheticAlignment: 80,
        missionAlignment: 80,
        messagingAlignment: 80,
      });

      const result = await generateBrandAlignedScript(partialBrand, "Brief");

      expect(result.content).toBe("Content");
      expect(vi.mocked(generateBrandAlignedContent)).toHaveBeenCalledWith(
        partialBrand,
        "script",
        expect.any(String)
      );
    });
  });
});
