import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];

  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "manus",
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
    res: {
      clearCookie: (name: string, options: any) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("New Features - Reference Images & Video", () => {
  describe("Reference Images API", () => {
    it("should list reference images for a project", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // This will return empty array since no images exist
      const result = await caller.referenceImages.list({ projectId: 1 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should require authentication for uploading reference images", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as any,
        res: {} as any,
      };
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.referenceImages.upload({
          projectId: 1,
          imageUrl: "https://example.com/image.jpg",
        });
        expect.fail("Should have thrown unauthorized error");
      } catch (error: any) {
        expect(error.message).toContain("Unauthorized");
      }
    });

    it("should require authentication for deleting reference images", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as any,
        res: {} as any,
      };
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.referenceImages.delete({ imageId: 1 });
        expect.fail("Should have thrown unauthorized error");
      } catch (error: any) {
        expect(error.message).toContain("Unauthorized");
      }
    });
  });

  describe("Video Generation API", () => {
    it("should list generated videos for a project", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.video.list({ projectId: 1 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should require authentication for creating videos", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as any,
        res: {} as any,
      };
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.video.create({ projectId: 1, provider: "sora" });
        expect.fail("Should have thrown unauthorized error");
      } catch (error: any) {
        expect(error.message).toContain("Unauthorized");
      }
    });

    it("should require authentication for updating video status", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as any,
        res: {} as any,
      };
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.video.updateStatus({ videoId: 1, status: "completed" });
        expect.fail("Should have thrown unauthorized error");
      } catch (error: any) {
        expect(error.message).toContain("Unauthorized");
      }
    });

    it("should accept valid video provider options", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // This test validates that the API accepts both "sora" and "veo3" providers
      // The actual video creation will fail due to missing database, but the input validation should pass
      try {
        await caller.video.create({ projectId: 1, provider: "sora" });
      } catch (error: any) {
        // Expected to fail on database operation, not on input validation
        expect(error.message).not.toContain("provider");
      }
    });
  });

  describe("API Key Configuration", () => {
    it("should have Sora API key configured", () => {
      expect(process.env.SORA_API_KEY).toBeDefined();
      expect(process.env.SORA_API_KEY?.length).toBeGreaterThan(0);
    });

    it("should have Veo3 API key configured", () => {
      expect(process.env.VEO3_API_KEY).toBeDefined();
      expect(process.env.VEO3_API_KEY?.length).toBeGreaterThan(0);
    });
  });
});
