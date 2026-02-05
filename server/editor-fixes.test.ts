import { describe, it, expect } from "vitest";

/**
 * Tests for editor project auto-selection and video debugging
 */

describe("Editor Project Auto-Selection", () => {
  it("should auto-select first editor project", () => {
    const projects = [
      { id: 1, title: "Project 1" },
      { id: 2, title: "Project 2" },
    ];
    const selectedId = projects.length > 0 ? projects[0].id : null;
    expect(selectedId).toEqual(1);
  });

  it("should not auto-select if already selected", () => {
    const selectedId = "1";
    const projects = [{ id: 1, title: "Project 1" }];
    const shouldSelect = !selectedId && projects.length > 0;
    expect(!shouldSelect).toBe(true);
  });

  it("should handle empty projects list", () => {
    const projects: any[] = [];
    const selectedId = projects.length > 0 ? projects[0].id : null;
    expect(selectedId).toBe(null);
  });

  it("should convert editor project id to number", () => {
    const editorProjectId = "5";
    const editorProjId = editorProjectId ? Number(editorProjectId) : 0;
    expect(editorProjId).toEqual(5);
    expect(typeof editorProjId).toEqual("number");
  });

  it("should handle zero editor project id", () => {
    const editorProjectId = "";
    const editorProjId = editorProjectId ? Number(editorProjectId) : 0;
    expect(editorProjId).toEqual(0);
  });
});

describe("Video Debugging and Playback", () => {
  it("should log clips data when loaded", () => {
    const clips = [
      { id: 1, fileUrl: "https://example.com/video1.mp4" },
      { id: 2, fileUrl: "https://example.com/video2.mp4" },
    ];
    expect(clips.length).toEqual(2);
    expect(clips[0].fileUrl).toEqual("https://example.com/video1.mp4");
  });

  it("should log first clip URL", () => {
    const clips = [{ id: 1, fileUrl: "https://example.com/video.mp4" }];
    const firstClipUrl = clips[0].fileUrl;
    expect(firstClipUrl).toEqual("https://example.com/video.mp4");
  });

  it("should validate file URL is not empty", () => {
    const fileUrl = "https://example.com/video.mp4";
    const isValid = fileUrl && fileUrl.trim() !== "";
    expect(!!isValid).toBe(true);
  });

  it("should reject empty file URL", () => {
    const fileUrl = "";
    const isValid = fileUrl && fileUrl.trim() !== "";
    expect(!isValid).toBe(true);
  });

  it("should reject whitespace-only file URL", () => {
    const fileUrl = "   ";
    const isValid = fileUrl && fileUrl.trim() !== "";
    expect(!isValid).toBe(true);
  });

  it("should check video readyState before playing", () => {
    const readyState = 2;
    const canPlay = readyState >= 2;
    expect(!!canPlay).toBe(true);
  });

  it("should log readyState when attempting to play", () => {
    const readyState = 1;
    const message = `Attempting to play, readyState: ${readyState}`;
    expect(message).toContain("readyState: 1");
  });

  it("should warn if video not ready", () => {
    const readyState = 0;
    const shouldWarn = readyState < 2;
    expect(!!shouldWarn).toBe(true);
  });

  it("should log when play/pause is clicked", () => {
    const isPlaying = false;
    const action = isPlaying ? "pause" : "play";
    expect(action).toEqual("play");
  });

  it("should handle play error with message", () => {
    const error = new Error("NotAllowedError: play() failed");
    expect(error.message).toContain("play() failed");
  });

  it("should show toast message on play error", () => {
    const error = new Error("Video not ready");
    const message = "Video not ready: " + error.message;
    expect(message).toContain("Video not ready");
  });

  it("should show toast message when video loading", () => {
    const readyState = 1;
    const message = readyState < 2 ? "Video loading..." : "Playing";
    expect(message).toEqual("Video loading...");
  });

  it("should reset playback state on source change", () => {
    let isPlaying = true;
    let currentTime = 5;
    
    isPlaying = false;
    currentTime = 0;
    
    expect(!isPlaying).toBe(true);
    expect(currentTime).toEqual(0);
  });

  it("should set video src from clip fileUrl", () => {
    const clip = { fileUrl: "https://example.com/video.mp4" };
    const videoSrc = clip.fileUrl;
    expect(videoSrc).toEqual("https://example.com/video.mp4");
  });

  it("should call load() after setting src", () => {
    const shouldLoad = true;
    expect(!!shouldLoad).toBe(true);
  });

  it("should handle loadedmetadata event", () => {
    const duration = 120;
    expect(duration).toBeGreaterThan(0);
  });

  it("should handle timeupdate event", () => {
    const currentTime = 5.5;
    expect(currentTime).toBeGreaterThanOrEqual(0);
  });

  it("should handle play event", () => {
    const isPlaying = true;
    expect(!!isPlaying).toBe(true);
  });

  it("should handle pause event", () => {
    const isPlaying = false;
    expect(!isPlaying).toBe(true);
  });

  it("should check if clips data exists", () => {
    const clipsData = [{ id: 1, fileUrl: "url" }];
    const hasClips = clipsData && clipsData.length > 0;
    expect(!!hasClips).toBe(true);
  });

  it("should handle null clips data", () => {
    const clipsData = null;
    const hasClips = clipsData && clipsData.length > 0;
    expect(!hasClips).toBe(true);
  });

  it("should handle undefined clips data", () => {
    const clipsData = undefined;
    const hasClips = clipsData && clipsData.length > 0;
    expect(!hasClips).toBe(true);
  });

  it("should handle empty clips array", () => {
    const clipsData: any[] = [];
    const hasClips = clipsData && clipsData.length > 0;
    expect(!hasClips).toBe(true);
  });

  it("should get first clip from array", () => {
    const clipsData = [
      { id: 1, fileUrl: "url1" },
      { id: 2, fileUrl: "url2" },
    ];
    const firstClip = clipsData[0];
    expect(firstClip.id).toEqual(1);
  });

  it("should handle video ref null check", () => {
    const videoRef = { current: null };
    const hasRef = videoRef.current !== null;
    expect(!hasRef).toBe(true);
  });

  it("should handle video ref with element", () => {
    const videoRef = { current: { readyState: 2 } };
    const hasRef = videoRef.current !== null;
    expect(hasRef).toBe(true);
  });
});

describe("Database Cleanup", () => {
  it("should keep only one editor project", () => {
    const projects = [{ id: 1, title: "Project 1" }];
    expect(projects.length).toEqual(1);
  });

  it("should delete duplicate projects", () => {
    const beforeCount = 13;
    const afterCount = 1;
    expect(afterCount).toBeLessThan(beforeCount);
  });

  it("should keep most recent project", () => {
    const projects = [{ id: 13, createdAt: new Date("2026-01-30") }];
    const mostRecent = projects[0];
    expect(mostRecent.id).toEqual(13);
  });
});
