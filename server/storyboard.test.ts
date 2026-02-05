import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("Storyboard Initialization", () => {
  it("should have generateImagePrompt procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Check if the procedure exists
    expect(caller.ai.generateImagePrompt).toBeDefined();
  });

  it("should handle technical shot input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const testShot = {
      shot: 1,
      tipo_plano: "Close-up",
      accion: "Test action",
      intencion: "Test intention",
    };

    try {
      const result = await caller.ai.generateImagePrompt({
        shot: testShot,
        visualStyle: "Dark, cinematic style",
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    } catch (error) {
      console.error("Error in generateImagePrompt:", error);
      throw error;
    }
  });
});
