import { describe, it, expect } from "vitest";
import {
  generateConsistentPrompt,
  generateVariationPrompt,
  generateSeed,
  extractCharacterNamesFromPrompt,
  validateCharacterConsistency,
} from "./services/characterConsistency";

describe("Character Consistency", () => {
  const mockCharacterReference = {
    Alice: "A young woman with long blonde hair, wearing a blue dress, confident demeanor",
    Bob: "An older man with gray beard, wearing a brown jacket, wise expression",
  };

  describe("generateConsistentPrompt", () => {
    it("should generate prompt with character descriptions", () => {
      const basePrompt = "Alice and Bob meet in a coffee shop";
      const shotContext = "establishing shot";

      const result = generateConsistentPrompt(basePrompt, mockCharacterReference, shotContext);

      expect(result).toContain(basePrompt);
      expect(result).toContain("Alice");
      expect(result).toContain("Bob");
      expect(result).toContain("CHARACTER CONSISTENCY REQUIREMENTS");
      expect(result).toContain("long blonde hair");
      expect(result).toContain("gray beard");
    });

    it("should include character descriptions in output", () => {
      const basePrompt = "Scene with characters";
      const result = generateConsistentPrompt(basePrompt, mockCharacterReference, "scene");

      expect(result).toContain("blue dress");
      expect(result).toContain("brown jacket");
    });
  });

  describe("generateVariationPrompt", () => {
    it("should generate variation prompt with different angle", () => {
      const basePrompt = "Alice and Bob talking";
      const result = generateVariationPrompt(basePrompt, mockCharacterReference, 0);

      expect(result).toContain(basePrompt);
      expect(result).toContain("VARIATION");
      expect(result).toContain("slightly different angle");
      expect(result).toContain("CHARACTER CONSISTENCY REQUIREMENTS");
    });

    it("should cycle through different variations", () => {
      const basePrompt = "Scene";
      const variations = [
        generateVariationPrompt(basePrompt, mockCharacterReference, 0),
        generateVariationPrompt(basePrompt, mockCharacterReference, 1),
        generateVariationPrompt(basePrompt, mockCharacterReference, 2),
      ];

      expect(variations[0]).toContain("slightly different angle");
      expect(variations[1]).toContain("different lighting setup");
      expect(variations[2]).toContain("closer camera position");
    });

    it("should maintain character consistency in variations", () => {
      const basePrompt = "Alice and Bob";
      const result = generateVariationPrompt(basePrompt, mockCharacterReference, 0);

      expect(result).toContain("Alice");
      expect(result).toContain("Bob");
      expect(result).toContain("character details");
    });
  });

  describe("generateSeed", () => {
    it("should generate deterministic seed", () => {
      const seed1 = generateSeed(1, 1, 0);
      const seed2 = generateSeed(1, 1, 0);

      expect(seed1).toBe(seed2);
      expect(typeof seed1).toBe("number");
      expect(seed1).toBeGreaterThanOrEqual(0);
    });

    it("should generate different seeds for different inputs", () => {
      const seed1 = generateSeed(1, 1, 0);
      const seed2 = generateSeed(1, 2, 0);
      const seed3 = generateSeed(1, 1, 1);

      expect(seed1).not.toBe(seed2);
      expect(seed1).not.toBe(seed3);
      expect(seed2).not.toBe(seed3);
    });

    it("should return positive numbers", () => {
      for (let i = 0; i < 10; i++) {
        const seed = generateSeed(1, i, 0);
        expect(seed).toBeGreaterThanOrEqual(0);
        expect(seed).toBeLessThan(2147483647);
      }
    });
  });

  describe("extractCharacterNamesFromPrompt", () => {
    it("should extract character names from prompt", () => {
      const prompt = "Alice and Bob meet in the park. Alice is happy.";
      const names = extractCharacterNamesFromPrompt(prompt);

      expect(names).toContain("Alice");
      expect(names).toContain("Bob");
    });

    it("should handle single character names", () => {
      const prompt = "John walks down the street";
      const names = extractCharacterNamesFromPrompt(prompt);

      expect(names).toContain("John");
    });

    it("should limit to 5 character names", () => {
      const prompt = "Alice Bob Charlie David Eve Frank George";
      const names = extractCharacterNamesFromPrompt(prompt);

      expect(names.length).toBeLessThanOrEqual(5);
    });

    it("should return empty array for no names", () => {
      const prompt = "A person walks in the park";
      const names = extractCharacterNamesFromPrompt(prompt);

      expect(Array.isArray(names)).toBe(true);
    });
  });

  describe("validateCharacterConsistency", () => {
    it("should validate consistent character mentions", () => {
      const prompt1 = "Alice and Bob meet";
      const prompt2 = "Alice and Bob talk";

      const result = validateCharacterConsistency(prompt1, prompt2, mockCharacterReference);

      expect(result.isConsistent).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should detect missing characters", () => {
      const prompt1 = "Alice and Bob meet";
      const prompt2 = "Alice talks alone";

      const result = validateCharacterConsistency(prompt1, prompt2, mockCharacterReference);

      expect(result.isConsistent).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain("Bob");
    });

    it("should be case insensitive", () => {
      const prompt1 = "ALICE and BOB";
      const prompt2 = "alice and bob";

      const result = validateCharacterConsistency(prompt1, prompt2, mockCharacterReference);

      expect(result.isConsistent).toBe(true);
    });

    it("should handle empty character reference", () => {
      const prompt1 = "Scene 1";
      const prompt2 = "Scene 2";

      const result = validateCharacterConsistency(prompt1, prompt2, {});

      expect(result.isConsistent).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe("Character Consistency Workflow", () => {
    it("should maintain consistency across multiple shots", () => {
      const shots = [
        generateConsistentPrompt("Alice enters", mockCharacterReference, "shot 1"),
        generateConsistentPrompt("Alice sits down", mockCharacterReference, "shot 2"),
        generateConsistentPrompt("Alice speaks", mockCharacterReference, "shot 3"),
      ];

      for (const shot of shots) {
        expect(shot).toContain("Alice");
        expect(shot).toContain("blue dress");
      }
    });

    it("should generate variations without breaking consistency", () => {
      const basePrompt = "Alice and Bob in conversation";
      const variations = [];

      for (let i = 0; i < 3; i++) {
        const variant = generateVariationPrompt(basePrompt, mockCharacterReference, i);
        variations.push(variant);
        expect(variant).toContain("Alice");
        expect(variant).toContain("Bob");
      }

      // All variations should be different
      expect(variations[0]).not.toBe(variations[1]);
      expect(variations[1]).not.toBe(variations[2]);
    });
  });
});
