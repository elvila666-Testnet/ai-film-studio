import { describe, it, expect } from "vitest";
import { getNanobanaCredits } from "./services/nanobananaGeneration";

describe("Nanobanana Pro API Integration", () => {
  it("should validate API credentials by fetching account credits", async () => {
    try {
      const credits = await getNanobanaCredits();
      expect(typeof credits).toBe("number");
      expect(credits).toBeGreaterThanOrEqual(0);
      console.log(`✓ Nanobanana API validated. Credits: ${credits}`);
    } catch (error) {
      console.error("Nanobanana API validation failed:", error);
      throw error;
    }
  });
});
