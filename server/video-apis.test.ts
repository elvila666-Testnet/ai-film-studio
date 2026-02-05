import { describe, expect, it } from "vitest";

describe("Video Generation APIs", () => {
  it("should have Sora API key configured", () => {
    const soraKey = process.env.SORA_API_KEY;
    expect(soraKey).toBeDefined();
    expect(soraKey?.length).toBeGreaterThan(0);
  });

  it("should have Veo3 API key configured", () => {
    const veo3Key = process.env.VEO3_API_KEY;
    expect(veo3Key).toBeDefined();
    expect(veo3Key?.length).toBeGreaterThan(0);
  });

  it("should validate Sora API key format", async () => {
    const soraKey = process.env.SORA_API_KEY;
    // Sora API keys are typically hex strings
    expect(soraKey).toMatch(/^[a-f0-9]{32}$/i);
  });

  it("should validate Veo3 API key format", async () => {
    const veo3Key = process.env.VEO3_API_KEY;
    // Veo3 uses Google API keys which start with AIzaSy
    expect(veo3Key).toMatch(/^AIzaSy[A-Za-z0-9_-]{33}$/);
  });
});
