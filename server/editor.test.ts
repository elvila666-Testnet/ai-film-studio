import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
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
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Video Editor API", () => {
  let projectId = 1;
  let editorProjectId = 0;
  let trackId = 0;
  let clipId = 0;
  let exportId = 0;

  it("should create an editor project", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.editor.projects.create({
      projectId,
      title: "Test Editor Project",
      description: "Test description",
      fps: 24,
      resolution: "1920x1080",
    });

    expect(result.success).toBe(true);
    expect(result.editorProjectId).toBeGreaterThan(0);
    editorProjectId = result.editorProjectId;
  });

  it("should list editor projects", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const projects = await caller.editor.projects.list({ projectId });

    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThan(0);
  });

  it("should create a video track", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.editor.tracks.create({
      editorProjectId,
      trackType: "video",
      trackNumber: 1,
      name: "Video Track 1",
    });

    expect(result.success).toBe(true);
    expect(result.trackId).toBeGreaterThan(0);
    trackId = result.trackId;
  });

  it("should create an audio track", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.editor.tracks.create({
      editorProjectId,
      trackType: "audio",
      trackNumber: 2,
      name: "Audio Track 1",
    });

    expect(result.success).toBe(true);
    expect(result.trackId).toBeGreaterThan(0);
  });

  it("should list tracks", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const tracks = await caller.editor.tracks.list({ editorProjectId });

    expect(Array.isArray(tracks)).toBe(true);
    expect(tracks.length).toBeGreaterThanOrEqual(2);
  });

  it("should upload a video clip", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.editor.clips.upload({
      editorProjectId,
      trackId,
      fileUrl: "https://example.com/video.mp4",
      fileName: "test-video.mp4",
      fileType: "video",
      duration: 5000, // 5 seconds in ms
      order: 1,
    });

    expect(result.success).toBe(true);
    expect(result.clipId).toBeGreaterThan(0);
    clipId = result.clipId;
  });

  it("should upload an audio clip", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.editor.clips.upload({
      editorProjectId,
      trackId: trackId + 1, // Audio track
      fileUrl: "https://example.com/audio.mp3",
      fileName: "test-audio.mp3",
      fileType: "audio",
      duration: 5000, // 5 seconds in ms
      order: 1,
    });

    expect(result.success).toBe(true);
    expect(result.clipId).toBeGreaterThan(0);
  });

  it("should list clips", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const clips = await caller.editor.clips.list({ editorProjectId });

    expect(Array.isArray(clips)).toBe(true);
    expect(clips.length).toBeGreaterThanOrEqual(1);
  });

  it("should update a clip", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.editor.clips.update({
      clipId,
      trimStart: 500,
      trimEnd: 4500,
      volume: 80,
    });

    expect(result.success).toBe(true);
  });

  it("should create an export", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.editor.export.create({
      editorProjectId,
      format: "mp4",
      quality: "1080p",
    });

    expect(result.success).toBe(true);
    expect(result.exportId).toBeGreaterThan(0);
    exportId = result.exportId;
  });

  it("should list exports", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const exports = await caller.editor.export.list({ editorProjectId });

    expect(Array.isArray(exports)).toBe(true);
    expect(exports.length).toBeGreaterThanOrEqual(1);
  });

  it("should update export status", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.editor.export.updateStatus({
      exportId,
      status: "processing",
    });

    expect(result.success).toBe(true);
  });

  it("should delete a clip", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a clip to delete
    const uploadResult = await caller.editor.clips.upload({
      editorProjectId,
      trackId,
      fileUrl: "https://example.com/video2.mp4",
      fileName: "test-video2.mp4",
      fileType: "video",
      duration: 3000,
      order: 2,
    });

    const deleteResult = await caller.editor.clips.delete({
      clipId: uploadResult.clipId,
    });

    expect(deleteResult.success).toBe(true);
  });

  it("should reject unauthorized access", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    try {
      await caller.editor.projects.create({
        projectId,
        title: "Unauthorized Project",
        fps: 24,
        resolution: "1920x1080",
      });
      expect.fail("Should have thrown unauthorized error");
    } catch (error) {
      expect((error as Error).message).toContain("Unauthorized");
    }
  });
});
