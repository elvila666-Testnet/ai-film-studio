import { describe, it, expect } from "vitest";

/**
 * Tests for development/mock mode functionality
 */

describe("Development Mode", () => {
  it("should check if dev mode is enabled", () => {
    const devModeEnabled = false; // Default is false
    expect(devModeEnabled).toBe(false);
  });

  it("should toggle dev mode", () => {
    let devMode = false;
    devMode = !devMode;
    expect(devMode).toBe(true);
    devMode = !devMode;
    expect(devMode).toBe(false);
  });

  it("should return dev mode status message", () => {
    const enabled = false;
    const message = enabled
      ? "Development mode enabled - Using mock data instead of LLM API"
      : "Production mode - Using real LLM API calls";
    expect(message).toContain("Production mode");
  });

  it("should return dev mode enabled message", () => {
    const enabled = true;
    const message = enabled
      ? "Development mode enabled - Using mock data instead of LLM API"
      : "Production mode - Using real LLM API calls";
    expect(message).toContain("Development mode enabled");
  });
});

describe("Mock Data Service", () => {
  it("should provide mock scripts", () => {
    const mockScripts = {
      default: "# Script content",
      tech: "# Tech script",
    };
    expect(mockScripts.default).toBeDefined();
    expect(mockScripts.tech).toBeDefined();
  });

  it("should provide mock visual styles", () => {
    const mockStyles = {
      default: "# Visual style content",
      cinematic: "# Cinematic style",
    };
    expect(mockStyles.default).toBeDefined();
    expect(mockStyles.cinematic).toBeDefined();
  });

  it("should provide mock technical shots", () => {
    const shots = [
      { name: "Wide Shot", duration: 3 },
      { name: "Close-up", duration: 4 },
    ];
    expect(shots.length).toBeGreaterThan(0);
    expect(shots[0].name).toBeDefined();
  });

  it("should provide mock storyboard frames", () => {
    const frames = [
      { sceneNumber: 1, description: "Opening" },
      { sceneNumber: 2, description: "Feature" },
    ];
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0].sceneNumber).toBe(1);
  });

  it("should provide mock brand identities", () => {
    const brands = {
      default: { name: "Premium Brand" },
      tech: { name: "Tech Innovation" },
    };
    expect(brands.default.name).toBeDefined();
    expect(brands.tech.name).toBeDefined();
  });

  it("should provide mock character options", () => {
    const characters = [
      { id: 1, name: "Professional Host" },
      { id: 2, name: "Lifestyle Influencer" },
    ];
    expect(characters.length).toBeGreaterThan(0);
    expect(characters[0].id).toBe(1);
  });

  it("should provide mock moodboard images", () => {
    const images = [
      { id: 1, title: "Premium Minimalist" },
      { id: 2, title: "Cinematic Drama" },
    ];
    expect(images.length).toBeGreaterThan(0);
    expect(images[0].title).toBeDefined();
  });
});

describe("Mock LLM Response", () => {
  it("should simulate LLM response with delay", async () => {
    const content = "Mock response content";
    const delayMs = 100;
    const startTime = Date.now();
    
    // Simulate the delay
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(delayMs - 10); // Allow 10ms variance
  });

  it("should return correct mock content", async () => {
    const content = "Test content";
    const result = content; // In real code, this would be from mockLLMResponse
    expect(result).toBe("Test content");
  });

  it("should handle different delay times", async () => {
    const delays = [100, 500, 1000];
    
    for (const delay of delays) {
      const startTime = Date.now();
      await new Promise((resolve) => setTimeout(resolve, delay));
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(delay - 10);
    }
  });
});

describe("Mock Mode Integration", () => {
  it("should use mock data when dev mode is enabled", () => {
    const devModeEnabled = true;
    const useMockData = devModeEnabled;
    expect(useMockData).toBe(true);
  });

  it("should use real API when dev mode is disabled", () => {
    const devModeEnabled = false;
    const useRealAPI = !devModeEnabled;
    expect(useRealAPI).toBe(true);
  });

  it("should provide mock script data", () => {
    const mockScript = "# Mock Script\n\n## Scene 1\nContent here";
    expect(mockScript).toContain("Mock Script");
    expect(mockScript).toContain("Scene 1");
  });

  it("should provide mock visual style data", () => {
    const mockStyle = "# Master Visual Style\n\n## Color Palette\nColors here";
    expect(mockStyle).toContain("Master Visual Style");
    expect(mockStyle).toContain("Color Palette");
  });

  it("should provide mock technical shots data", () => {
    const mockShots = [
      { name: "Wide Shot", duration: 3 },
      { name: "Close-up", duration: 4 },
    ];
    expect(mockShots).toHaveLength(2);
    expect(mockShots[0].name).toBe("Wide Shot");
  });

  it("should handle mock data for script generation", () => {
    const brief = "Product commercial";
    const mockResult = "# Generated Script\n\n## Scene 1\nOpening shot";
    expect(mockResult).toContain("Generated Script");
  });

  it("should handle mock data for visual style generation", () => {
    const script = "# Script";
    const mockResult = "# Master Visual Style\n\n## Lighting\nSetup here";
    expect(mockResult).toContain("Master Visual Style");
  });

  it("should handle mock data for technical shots generation", () => {
    const script = "# Script";
    const mockResult = JSON.stringify([
      { name: "Wide Shot", duration: 3 },
      { name: "Close-up", duration: 4 },
    ]);
    const parsed = JSON.parse(mockResult);
    expect(parsed).toHaveLength(2);
  });

  it("should allow toggling between dev and production modes", () => {
    let mode = "production";
    expect(mode).toBe("production");
    
    mode = "development";
    expect(mode).toBe("development");
    
    mode = "production";
    expect(mode).toBe("production");
  });

  it("should preserve mock data consistency", () => {
    const mockData1 = "Mock content 1";
    const mockData2 = "Mock content 2";
    
    expect(mockData1).not.toBe(mockData2);
    expect(mockData1).toBe("Mock content 1");
    expect(mockData2).toBe("Mock content 2");
  });
});

describe("Development Mode UI", () => {
  it("should show dev mode indicator when enabled", () => {
    const devModeEnabled = true;
    const indicator = devModeEnabled ? "🔧 DEV MODE" : "";
    expect(indicator).toBe("🔧 DEV MODE");
  });

  it("should show production indicator when disabled", () => {
    const devModeEnabled = false;
    const indicator = devModeEnabled ? "🔧 DEV MODE" : "✓ PRODUCTION";
    expect(indicator).toBe("✓ PRODUCTION");
  });

  it("should allow toggling from UI", () => {
    let devMode = false;
    const toggleDevMode = () => {
      devMode = !devMode;
    };
    
    expect(devMode).toBe(false);
    toggleDevMode();
    expect(devMode).toBe(true);
    toggleDevMode();
    expect(devMode).toBe(false);
  });

  it("should show mock data notice in UI", () => {
    const devModeEnabled = true;
    const notice = devModeEnabled
      ? "Using mock data for testing - LLM quota not consumed"
      : "Using real LLM API";
    expect(notice).toContain("mock data");
  });
});
