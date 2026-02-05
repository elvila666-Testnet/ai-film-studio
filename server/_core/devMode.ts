/**
 * Development mode configuration
 * Enables mock data and bypasses LLM API calls for testing
 */

/**
 * Check if development mode is enabled
 * Can be controlled via:
 * 1. VITE_DEV_MODE=true environment variable
 * 2. URL query parameter: ?devMode=1
 * 3. localStorage: localStorage.setItem('devMode', 'true')
 */
export function isDevModeEnabled(): boolean {
  // Check environment variable (server-side)
  if (typeof process !== "undefined" && process.env.VITE_DEV_MODE === "true") {
    return true;
  }

  // Check localStorage (client-side)
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("devMode");
    if (stored === "true") {
      return true;
    }

    // Check URL query parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get("devMode") === "1") {
      localStorage.setItem("devMode", "true");
      return true;
    }
  }

  return false;
}

/**
 * Toggle development mode
 */
export function toggleDevMode(): boolean {
  if (typeof window !== "undefined") {
    const current = isDevModeEnabled();
    if (current) {
      localStorage.removeItem("devMode");
    } else {
      localStorage.setItem("devMode", "true");
    }
    window.location.reload();
  }
  return !isDevModeEnabled();
}

/**
 * Get development mode status
 */
export function getDevModeStatus() {
  return {
    enabled: isDevModeEnabled(),
    message: isDevModeEnabled()
      ? "Development mode enabled - Using mock data instead of LLM API"
      : "Production mode - Using real LLM API calls",
  };
}

/**
 * Mock LLM response with simulated delay
 */
export async function mockLLMResponse(content: string, delayMs: number = 1000): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(content);
    }, delayMs);
  });
}

/**
 * Simulate LLM streaming response
 */
export async function* mockLLMStream(content: string, chunkSize: number = 50, delayMs: number = 100) {
  for (let i = 0; i < content.length; i += chunkSize) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    yield content.slice(i, i + chunkSize);
  }
}
