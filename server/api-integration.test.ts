import { describe, it, expect } from "vitest";
import { invokeLLM } from "./_core/llm";

describe("API Integrations", () => {
  it("should validate Gemini API key by making a simple request", async () => {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant.",
          },
          {
            role: "user",
            content: "Say 'API key is valid' if you can read this.",
          },
        ],
      });

      expect(response).toBeDefined();
      expect(response.choices).toBeDefined();
      expect(response.choices.length).toBeGreaterThan(0);
      expect(response.choices[0].message.content).toBeTruthy();
    } catch (error) {
      throw new Error(`Gemini API validation failed: ${error}`);
    }
  });
});
