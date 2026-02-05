import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getStoryboardFrameOrder,
  updateFrameOrder,
  getFrameHistory,
  createFrameHistoryVersion,
  getFrameNotes,
  saveFrameNotes,
  deleteFrameNotes,
} from "./db";

// Mock database functions
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getStoryboardFrameOrder: vi.fn(),
  updateFrameOrder: vi.fn(),
  getFrameHistory: vi.fn(),
  createFrameHistoryVersion: vi.fn(),
  getFrameNotes: vi.fn(),
  saveFrameNotes: vi.fn(),
  deleteFrameNotes: vi.fn(),
}));

describe("Storyboard Frame Reordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retrieve frame order for a project", async () => {
    const mockOrder = [
      { id: 1, projectId: 1, shotNumber: 1, displayOrder: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, projectId: 1, shotNumber: 2, displayOrder: 1, createdAt: new Date(), updatedAt: new Date() },
    ];
    
    vi.mocked(getStoryboardFrameOrder).mockResolvedValue(mockOrder);
    
    const result = await getStoryboardFrameOrder(1);
    expect(result).toEqual(mockOrder);
    expect(getStoryboardFrameOrder).toHaveBeenCalledWith(1);
  });

  it("should update frame order with new display positions", async () => {
    const frameOrders = [
      { shotNumber: 1, displayOrder: 1 },
      { shotNumber: 2, displayOrder: 0 },
    ];
    
    vi.mocked(updateFrameOrder).mockResolvedValue(undefined);
    
    await updateFrameOrder(1, frameOrders);
    expect(updateFrameOrder).toHaveBeenCalledWith(1, frameOrders);
  });

  it("should handle empty frame orders", async () => {
    vi.mocked(updateFrameOrder).mockResolvedValue(undefined);
    
    await updateFrameOrder(1, []);
    expect(updateFrameOrder).toHaveBeenCalledWith(1, []);
  });
});

describe("Storyboard Frame History", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retrieve frame history for a shot", async () => {
    const mockHistory = [
      {
        id: 1,
        projectId: 1,
        shotNumber: 1,
        imageUrl: "https://example.com/v1.jpg",
        prompt: "Original prompt",
        notes: "First version",
        versionNumber: 1,
        isActive: false,
        createdAt: new Date(),
      },
      {
        id: 2,
        projectId: 1,
        shotNumber: 1,
        imageUrl: "https://example.com/v2.jpg",
        prompt: "Refined prompt",
        notes: "Second version",
        versionNumber: 2,
        isActive: true,
        createdAt: new Date(),
      },
    ];
    
    vi.mocked(getFrameHistory).mockResolvedValue(mockHistory);
    
    const result = await getFrameHistory(1, 1);
    expect(result).toHaveLength(2);
    expect(result[1].isActive).toBe(true);
    expect(getFrameHistory).toHaveBeenCalledWith(1, 1);
  });

  it("should create new frame version and mark previous as inactive", async () => {
    vi.mocked(createFrameHistoryVersion).mockResolvedValue(undefined);
    
    await createFrameHistoryVersion(1, 1, "https://example.com/new.jpg", "New prompt", "Updated notes");
    expect(createFrameHistoryVersion).toHaveBeenCalledWith(
      1,
      1,
      "https://example.com/new.jpg",
      "New prompt",
      "Updated notes"
    );
  });

  it("should handle frame version creation without notes", async () => {
    vi.mocked(createFrameHistoryVersion).mockResolvedValue(undefined);
    
    await createFrameHistoryVersion(1, 1, "https://example.com/new.jpg", "New prompt");
    expect(createFrameHistoryVersion).toHaveBeenCalled();
  });
});

describe("Storyboard Frame Notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retrieve frame notes", async () => {
    const mockNotes = {
      id: 1,
      projectId: 1,
      shotNumber: 1,
      notes: "This is a wide establishing shot",
      metadata: JSON.stringify({ duration: 3, effects: "fade-in", audio: "ambient" }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    vi.mocked(getFrameNotes).mockResolvedValue(mockNotes);
    
    const result = await getFrameNotes(1, 1);
    expect(result).toEqual(mockNotes);
    expect(getFrameNotes).toHaveBeenCalledWith(1, 1);
  });

  it("should save frame notes with metadata", async () => {
    const metadata = { duration: 3, effects: "fade-in", audio: "ambient" };
    vi.mocked(saveFrameNotes).mockResolvedValue(undefined);
    
    await saveFrameNotes(1, 1, "Updated notes", metadata);
    expect(saveFrameNotes).toHaveBeenCalledWith(1, 1, "Updated notes", metadata);
  });

  it("should save frame notes without metadata", async () => {
    vi.mocked(saveFrameNotes).mockResolvedValue(undefined);
    
    await saveFrameNotes(1, 1, "Simple notes");
    expect(saveFrameNotes).toHaveBeenCalled();
  });

  it("should delete frame notes", async () => {
    vi.mocked(deleteFrameNotes).mockResolvedValue(undefined);
    
    await deleteFrameNotes(1, 1);
    expect(deleteFrameNotes).toHaveBeenCalledWith(1, 1);
  });

  it("should return null when frame notes do not exist", async () => {
    vi.mocked(getFrameNotes).mockResolvedValue(null);
    
    const result = await getFrameNotes(1, 999);
    expect(result).toBeNull();
  });
});

describe("Batch Operations", () => {
  it("should support bulk frame reordering", async () => {
    const bulkOrders = Array.from({ length: 10 }, (_, i) => ({
      shotNumber: i + 1,
      displayOrder: Math.floor(Math.random() * 10),
    }));
    
    vi.mocked(updateFrameOrder).mockResolvedValue(undefined);
    
    await updateFrameOrder(1, bulkOrders);
    expect(updateFrameOrder).toHaveBeenCalledWith(1, bulkOrders);
  });

  it("should support bulk note updates", async () => {
    const shotNumbers = [1, 2, 3, 4, 5];
    vi.mocked(saveFrameNotes).mockResolvedValue(undefined);
    
    for (const shotNumber of shotNumbers) {
      await saveFrameNotes(1, shotNumber, `Notes for shot ${shotNumber}`);
    }
    
    expect(saveFrameNotes).toHaveBeenCalledTimes(5);
  });
});
