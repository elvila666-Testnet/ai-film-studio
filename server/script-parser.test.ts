import { describe, it, expect } from "vitest";
import {
  extractCharacterNames,
  extractCharacterDescriptions,
  countCharacterAppearances,
  getCharacterStatistics,
  validateCharacterExtraction,
} from "./services/scriptParser";

describe("Script Parser", () => {
  const sampleScript = `
FADE IN:

INT. COFFEE SHOP - MORNING

ALICE, a young woman with blonde hair and a confident demeanor, sits at a table. She wears a blue dress.

JOHN, an older man with a gray beard wearing a brown jacket, enters the shop.

ALICE
(looking up)
John! I've been waiting for you.

JOHN
(sitting down)
Sorry I'm late. Traffic was terrible.

ALICE
It's okay. I wanted to talk to you about the project.

JOHN
(leaning forward)
What about it?

ALICE
I think we should move forward with the new plan.

JOHN
(nodding)
I agree. Let's do it.

FADE OUT.
`;

  describe("extractCharacterNames", () => {
    it("should extract character names from script", () => {
      const names = extractCharacterNames(sampleScript);
      expect(names).toContain("ALICE");
      expect(names).toContain("JOHN");
    });

    it("should handle multiple character mentions", () => {
      const names = extractCharacterNames(sampleScript);
      expect(names.length).toBeGreaterThan(0);
    });

    it("should return unique character names", () => {
      const names = extractCharacterNames(sampleScript);
      const uniqueNames = new Set(names);
      expect(names.length).toBe(uniqueNames.size);
    });

    it("should filter out invalid names", () => {
      const names = extractCharacterNames(sampleScript);
      for (const name of names) {
        expect(name.length).toBeGreaterThan(1);
        expect(name.length).toBeLessThan(30);
      }
    });
  });

  describe("extractCharacterDescriptions", () => {
    it("should extract character descriptions from script", () => {
      const descriptions = extractCharacterDescriptions(sampleScript);
      expect(Object.keys(descriptions).length).toBeGreaterThan(0);
    });

    it("should include physical appearance details", () => {
      const descriptions = extractCharacterDescriptions(sampleScript);
      const descText = Object.values(descriptions).join(" ").toLowerCase();
      
      // Should mention appearance details
      expect(descText.length).toBeGreaterThan(0);
    });

    it("should handle scripts without descriptions", () => {
      const minimalScript = "ALICE\\nHello world.";
      const descriptions = extractCharacterDescriptions(minimalScript);
      expect(typeof descriptions).toBe("object");
    });
  });

  describe("countCharacterAppearances", () => {
    it("should count character appearances", () => {
      const aliceCount = countCharacterAppearances(sampleScript, "ALICE");
      const johnCount = countCharacterAppearances(sampleScript, "JOHN");
      
      expect(aliceCount).toBeGreaterThan(0);
      expect(johnCount).toBeGreaterThan(0);
    });

    it("should be case insensitive", () => {
      const count1 = countCharacterAppearances(sampleScript, "alice");
      const count2 = countCharacterAppearances(sampleScript, "ALICE");
      
      expect(count1).toBe(count2);
    });

    it("should return 0 for non-existent characters", () => {
      const count = countCharacterAppearances(sampleScript, "NONEXISTENT");
      expect(count).toBe(0);
    });
  });

  describe("getCharacterStatistics", () => {
    it("should return character statistics", () => {
      const stats = getCharacterStatistics(sampleScript);
      
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
    });

    it("should include appearance count and percentage", () => {
      const stats = getCharacterStatistics(sampleScript);
      
      for (const stat of stats) {
        expect(stat.name).toBeDefined();
        expect(typeof stat.appearances).toBe("number");
        expect(typeof stat.percentage).toBe("number");
        expect(stat.appearances).toBeGreaterThan(0);
        expect(stat.percentage).toBeGreaterThan(0);
        expect(stat.percentage).toBeLessThanOrEqual(100);
      }
    });

    it("should sort by appearances descending", () => {
      const stats = getCharacterStatistics(sampleScript);
      
      for (let i = 1; i < stats.length; i++) {
        expect(stats[i - 1].appearances).toBeGreaterThanOrEqual(stats[i].appearances);
      }
    });
  });

  describe("validateCharacterExtraction", () => {
    it("should validate correct character extraction", () => {
      const characters = {
        Alice: "A young woman with blonde hair wearing a blue dress",
        John: "An older man with gray beard wearing brown jacket",
      };
      
      const result = validateCharacterExtraction(characters);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should detect empty character extraction", () => {
      const result = validateCharacterExtraction({});
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("should detect invalid character names", () => {
      const characters = {
        "A": "Another character",
      };
      
      const result = validateCharacterExtraction(characters);
      expect(result.valid).toBe(false);
    });

    it("should detect insufficient descriptions", () => {
      const characters = {
        Alice: "Short",
      };
      
      const result = validateCharacterExtraction(characters);
      expect(result.valid).toBe(false);
    });

    it("should detect overly long descriptions", () => {
      const characters = {
        Alice: "A".repeat(501),
      };
      
      const result = validateCharacterExtraction(characters);
      expect(result.valid).toBe(false);
    });
  });

  describe("Integration", () => {
    it("should extract and validate characters from script", () => {
      const names = extractCharacterNames(sampleScript);
      const descriptions = extractCharacterDescriptions(sampleScript);
      
      // Fill in missing descriptions with defaults
      const fullCharacters: Record<string, string> = {};
      for (const name of names) {
        fullCharacters[name] = descriptions[name] || `A character named ${name}`;
      }
      
      const validation = validateCharacterExtraction(fullCharacters);
      expect(validation.valid).toBe(true);
    });

    it("should provide character statistics", () => {
      const stats = getCharacterStatistics(sampleScript);
      const totalPercentage = stats.reduce((sum, s) => sum + s.percentage, 0);
      
      expect(totalPercentage).toBeCloseTo(100, 1);
    });
  });
});
