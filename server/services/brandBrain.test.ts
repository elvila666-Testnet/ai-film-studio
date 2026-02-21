import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  analyzeContentCompliance,
  generateBrandAlignedContent,
  extractBrandMetrics,
  validateBrandConsistency,
  BrandGuidelines,
} from "./brandBrain";

// Mock the LLM module
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "../_core/llm";

const mockInvokeLLM = vi.mocked(invokeLLM);

describe("Brand Brain Service", () => {
  const mockBrand: BrandGuidelines = {
    id: 1,
    name: "TechCorp",
    targetCustomer: "Tech-savvy professionals aged 25-40",
    aesthetic: "Minimalist, modern, clean",
    mission: "Empower businesses with technology",
    coreMessaging: "Innovation, reliability, customer success",
  };

  beforeEach(() => {
    mockInvokeLLM.mockClear();
  });

  describe("analyzeContentCompliance", () => {
    it("should analyze script content for brand compliance", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                isCompliant: true,
                score: {
                  overall: 85,
                  targetCustomerAlignment: 90,
                  aestheticAlignment: 80,
                  missionAlignment: 85,
                  messagingAlignment: 80,
                  issues: [],
                  recommendations: ["Consider adding more customer success messaging"],
                },
                summary: "Content aligns well with brand guidelines",
                suggestions: ["Strengthen customer success narrative"],
              }),
            },
          },
        ],
      };

      mockInvokeLLM.mockResolvedValue(mockResponse as any);

      const result = await analyzeContentCompliance(
        mockBrand,
        "script",
        "A tech company helps businesses grow"
      );

      expect(result.isCompliant).toBe(true);
      expect(result.score.overall).toBe(85);
      expect(result.score.targetCustomerAlignment).toBe(90);
      expect(result.summary).toContain("aligns well");
    });

    it("should handle non-compliant content", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                isCompliant: false,
                score: {
                  overall: 35,
                  targetCustomerAlignment: 40,
                  aestheticAlignment: 30,
                  missionAlignment: 35,
                  messagingAlignment: 30,
                  issues: [
                    "Tone is too casual for professional audience",
                    "Lacks innovation messaging",
                  ],
                  recommendations: [
                    "Adjust tone to be more professional",
                    "Emphasize innovation and reliability",
                  ],
                },
                summary: "Content does not align with brand guidelines",
                suggestions: [
                  "Revise for professional tone",
                  "Add innovation focus",
                ],
              }),
            },
          },
        ],
      };

      mockInvokeLLM.mockResolvedValue(mockResponse as any);

      const result = await analyzeContentCompliance(
        mockBrand,
        "script",
        "Hey dude, buy our stuff!"
      );

      expect(result.isCompliant).toBe(false);
      expect(result.score.overall).toBeLessThan(50);
      expect(result.score.issues.length).toBeGreaterThan(0);
    });

    it("should analyze visual content", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                isCompliant: true,
                score: {
                  overall: 90,
                  targetCustomerAlignment: 85,
                  aestheticAlignment: 95,
                  missionAlignment: 90,
                  messagingAlignment: 85,
                  issues: [],
                  recommendations: [],
                },
                summary: "Visual style matches brand aesthetic perfectly",
                suggestions: [],
              }),
            },
          },
        ],
      };

      mockInvokeLLM.mockResolvedValue(mockResponse as any);

      const result = await analyzeContentCompliance(
        mockBrand,
        "visual",
        "Minimalist white background with blue accents"
      );

      expect(result.score.aestheticAlignment).toBe(95);
      expect(result.isCompliant).toBe(true);
    });

    it("should handle LLM errors gracefully", async () => {
      mockInvokeLLM.mockRejectedValue(new Error("LLM error"));

      const result = await analyzeContentCompliance(
        mockBrand,
        "script",
        "Test content"
      );

      expect(result.isCompliant).toBe(false);
      expect(result.score.overall).toBe(0);
      expect(result.score.issues).toContain("Failed to analyze compliance");
    });
  });

  describe("generateBrandAlignedContent", () => {
    it("should generate script content aligned with brand", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content:
                "A professional script about technology innovation for business growth",
            },
          },
        ],
      };

      mockInvokeLLM.mockResolvedValue(mockResponse as any);

      const result = await generateBrandAlignedContent(
        mockBrand,
        "script",
        "Write a 30-second commercial script"
      );

      expect(result).toContain("technology");
      expect(result).toContain("innovation");
      expect(mockInvokeLLM).toHaveBeenCalled();

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain("TechCorp");
      expect(callArgs.messages[0].content).toContain("Brand");
    });

    it("should generate visual descriptions aligned with brand", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content:
                "Clean minimalist composition with blue and white palette, modern sans-serif typography",
            },
          },
        ],
      };

      mockInvokeLLM.mockResolvedValue(mockResponse as any);

      const result = await generateBrandAlignedContent(
        mockBrand,
        "visual",
        "Describe the visual style for a product showcase"
      );

      expect(result).toContain("minimalist");
      expect(result).toContain("blue");
    });

    it("should include content-specific instructions", async () => {
      mockInvokeLLM.mockResolvedValue({
        choices: [{ message: { role: "assistant", content: "Generated content" } as any }],
      } as any);

      await generateBrandAlignedContent(
        mockBrand,
        "voiceover",
        "Write voiceover for a commercial"
      );

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;

      expect(systemPrompt).toContain("VOICEOVER-SPECIFIC INSTRUCTIONS");
      expect(systemPrompt).toContain("Tone and delivery");
    });
  });

  describe("extractBrandMetrics", () => {
    it("should extract compliance metrics from content", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                isCompliant: true,
                score: {
                  overall: 80,
                  targetCustomerAlignment: 85,
                  aestheticAlignment: 75,
                  missionAlignment: 80,
                  messagingAlignment: 80,
                  issues: [],
                  recommendations: [],
                },
                summary: "Good alignment",
                suggestions: [],
              }),
            },
          },
        ],
      };

      mockInvokeLLM.mockResolvedValue(mockResponse as any);

      const metrics = await extractBrandMetrics(
        mockBrand,
        "Test script content"
      );

      expect(metrics.overall).toBe(80);
      expect(metrics.targetCustomerAlignment).toBe(85);
      expect(metrics.aestheticAlignment).toBe(75);
    });

    it("should return all metric dimensions", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                isCompliant: true,
                score: {
                  overall: 70,
                  targetCustomerAlignment: 70,
                  aestheticAlignment: 70,
                  missionAlignment: 70,
                  messagingAlignment: 70,
                  issues: [],
                  recommendations: [],
                },
                summary: "Adequate alignment",
                suggestions: [],
              }),
            },
          },
        ],
      };

      mockInvokeLLM.mockResolvedValue(mockResponse as any);

      const metrics = await extractBrandMetrics(mockBrand, "Content");

      expect(Object.keys(metrics)).toContain("overall");
      expect(Object.keys(metrics)).toContain("targetCustomerAlignment");
      expect(Object.keys(metrics)).toContain("aestheticAlignment");
      expect(Object.keys(metrics)).toContain("missionAlignment");
      expect(Object.keys(metrics)).toContain("messagingAlignment");
    });
  });

  describe("validateBrandConsistency", () => {
    it("should validate multiple content pieces for consistency", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
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
                summary: "Consistent with brand",
                suggestions: [],
              }),
            },
          },
        ],
      };

      mockInvokeLLM.mockResolvedValue(mockResponse as any);

      const result = await validateBrandConsistency(mockBrand, [
        { type: "script", content: "Script content" },
        { type: "visual", content: "Visual content" },
        { type: "storyboard", content: "Storyboard content" },
      ]);

      expect(result.consistent).toBe(true);
      expect(result.overallScore).toBe(80);
      expect(result.analyses.length).toBe(3);
    });

    it("should flag inconsistent content", async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
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
              }),
            } as any,
          } as any,
        ],
      } as any);

      mockInvokeLLM.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({
                isCompliant: false,
                score: {
                  overall: 40,
                  targetCustomerAlignment: 40,
                  aestheticAlignment: 40,
                  missionAlignment: 40,
                  messagingAlignment: 40,
                  issues: ["Misaligned content"],
                  recommendations: ["Revise"],
                },
                summary: "Poor alignment",
                suggestions: ["Revise"],
              }),
            } as any,
          } as any,
        ],
      } as any);

      const result = await validateBrandConsistency(mockBrand, [
        { type: "script", content: "Good content" },
        { type: "visual", content: "Bad content" },
      ]);

      expect(result.consistent).toBe(false);
      expect(result.overallScore).toBeLessThan(70);
    });

    it("should calculate average score correctly", async () => {
      mockInvokeLLM
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                role: "assistant",
                content: JSON.stringify({
                  isCompliant: true,
                  score: {
                    overall: 100,
                    targetCustomerAlignment: 100,
                    aestheticAlignment: 100,
                    missionAlignment: 100,
                    messagingAlignment: 100,
                    issues: [],
                    recommendations: [],
                  },
                  summary: "Perfect",
                  suggestions: [],
                }),
              } as any,
            } as any,
          ],
        } as any)
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                role: "assistant",
                content: JSON.stringify({
                  isCompliant: true,
                  score: {
                    overall: 60,
                    targetCustomerAlignment: 60,
                    aestheticAlignment: 60,
                    missionAlignment: 60,
                    messagingAlignment: 60,
                    issues: [],
                    recommendations: [],
                  },
                  summary: "Adequate",
                  suggestions: [],
                }),
              } as any,
            } as any,
          ],
        } as any);

      const result = await validateBrandConsistency(mockBrand, [
        { type: "script", content: "Perfect content" },
        { type: "visual", content: "Adequate content" },
      ]);

      expect(result.overallScore).toBe(80); // (100 + 60) / 2
    });
  });

  describe("Brand guidelines enforcement", () => {
    it("should include all brand parameters in system prompt", async () => {
      mockInvokeLLM.mockResolvedValue({
        choices: [{ message: { role: "assistant", content: "Generated" } as any }],
      } as any);

      await generateBrandAlignedContent(mockBrand, "script", "Generate");

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;

      expect(systemPrompt).toContain("TechCorp");
      expect(systemPrompt).toContain("Tech-savvy professionals");
      expect(systemPrompt).toContain("Minimalist, modern, clean");
      expect(systemPrompt).toContain("Empower businesses");
      expect(systemPrompt).toContain("Innovation, reliability");
    });

    it("should handle brands with partial information", async () => {
      const partialBrand: BrandGuidelines = {
        id: 2,
        name: "SimpleBrand",
        targetCustomer: "Everyone",
        // aesthetic, mission, coreMessaging are undefined
      };

      mockInvokeLLM.mockResolvedValue({
        choices: [{ message: { role: "assistant", content: "Generated" } as any }],
      } as any);

      await generateBrandAlignedContent(partialBrand, "script", "Generate");

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;

      expect(systemPrompt).toContain("SimpleBrand");
      expect(systemPrompt).toContain("Everyone");
      // Should not contain undefined fields
      expect(systemPrompt).not.toContain("undefined");
    });
  });

  describe("Content type specific instructions", () => {
    it("should include script-specific instructions", async () => {
      mockInvokeLLM.mockResolvedValue({
        choices: [{ message: { role: "assistant", content: "Generated" } as any }],
      } as any);

      await generateBrandAlignedContent(mockBrand, "script", "Generate");

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;

      expect(systemPrompt).toContain("SCRIPT-SPECIFIC");
      expect(systemPrompt).toContain("Dialogue");
      expect(systemPrompt).toContain("Characters");
    });

    it("should include visual-specific instructions", async () => {
      mockInvokeLLM.mockResolvedValue({
        choices: [{ message: { role: "assistant", content: "Generated" } as any }],
      } as any);

      await generateBrandAlignedContent(mockBrand, "visual", "Generate");

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;

      expect(systemPrompt).toContain("VISUAL-SPECIFIC");
      expect(systemPrompt).toContain("Color palette");
      expect(systemPrompt).toContain("Composition");
    });

    it("should include storyboard-specific instructions", async () => {
      mockInvokeLLM.mockResolvedValue({
        choices: [{ message: { role: "assistant", content: "Generated" } as any }],
      } as any);

      await generateBrandAlignedContent(mockBrand, "storyboard", "Generate");

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;

      expect(systemPrompt).toContain("STORYBOARD-SPECIFIC");
      expect(systemPrompt).toContain("Shot composition");
    });

    it("should include voiceover-specific instructions", async () => {
      mockInvokeLLM.mockResolvedValue({
        choices: [{ message: { role: "assistant", content: "Generated" } as any }],
      } as any);

      await generateBrandAlignedContent(mockBrand, "voiceover", "Generate");

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;

      expect(systemPrompt).toContain("VOICEOVER-SPECIFIC");
      expect(systemPrompt).toContain("Tone and delivery");
    });
  });
});
