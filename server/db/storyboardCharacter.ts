/**
 * Storyboard-Character Binding Database Helpers
 * CRUD operations for character references in storyboard frames
 */

import { getDb } from "../db";
import { storyboardImages, StoryboardImage } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Bind a character to a storyboard frame
 */
export async function bindCharacterToFrame(
  frameId: number,
  characterLibraryId: number,
  data: {
    characterAppearance?: string; // JSON: clothing, expression, pose
    consistencyScore?: number;
    consistencyNotes?: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(storyboardImages)
    .set({
      characterLibraryId,
      ...data,
    })
    .where(eq(storyboardImages.id, frameId));
}

/**
 * Get character binding for a frame
 */
export async function getFrameCharacterBinding(frameId: number): Promise<StoryboardImage | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(storyboardImages)
    .where(eq(storyboardImages.id, frameId));

  return result[0];
}

/**
 * Get all frames with a specific character in a project
 */
export async function getFramesWithCharacter(
  projectId: number,
  characterLibraryId: number
): Promise<StoryboardImage[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(storyboardImages)
    .where(
      and(
        eq(storyboardImages.projectId, projectId),
        eq(storyboardImages.characterLibraryId, characterLibraryId)
      )
    );
}

/**
 * Update character consistency score for a frame
 */
export async function updateFrameConsistencyScore(
  frameId: number,
  score: number,
  notes?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(storyboardImages)
    .set({
      consistencyScore: score,
      consistencyNotes: notes,
    })
    .where(eq(storyboardImages.id, frameId));
}

/**
 * Lock character consistency for a frame (prevent changes)
 */
export async function lockFrameCharacterConsistency(frameId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(storyboardImages)
    .set({ isConsistencyLocked: true })
    .where(eq(storyboardImages.id, frameId));
}

/**
 * Unlock character consistency for a frame (allow changes)
 */
export async function unlockFrameCharacterConsistency(frameId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(storyboardImages)
    .set({ isConsistencyLocked: false })
    .where(eq(storyboardImages.id, frameId));
}

/**
 * Get all frames in a project with character bindings
 */
export async function getProjectFramesWithCharacters(projectId: number): Promise<StoryboardImage[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(storyboardImages)
    .where(and(eq(storyboardImages.projectId, projectId)));
}

/**
 * Get frames with low consistency scores (potential issues)
 */
export async function getInconsistentFrames(
  projectId: number,
  threshold: number = 70
): Promise<StoryboardImage[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allFrames = await db
    .select()
    .from(storyboardImages)
    .where(eq(storyboardImages.projectId, projectId));

  return allFrames.filter((frame: StoryboardImage) => frame.consistencyScore !== null && frame.consistencyScore < threshold);
}

/**
 * Get character appearance summary for a project
 * Returns all unique character appearances across frames
 */
export async function getCharacterAppearanceSummary(
  projectId: number,
  characterLibraryId: number
): Promise<
  Array<{
    frameId: number;
    shotNumber: number;
    appearance: string;
    consistencyScore: number | null;
  }>
> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const frames = await db
    .select()
    .from(storyboardImages)
    .where(
      and(
        eq(storyboardImages.projectId, projectId),
        eq(storyboardImages.characterLibraryId, characterLibraryId)
      )
    );

  return frames
    .filter((frame: StoryboardImage) => frame.characterAppearance)
    .map((frame: StoryboardImage) => ({
      frameId: frame.id,
      shotNumber: frame.shotNumber,
      appearance: frame.characterAppearance || "",
      consistencyScore: frame.consistencyScore,
    }));
}

/**
 * Clear character binding from a frame
 */
export async function clearFrameCharacterBinding(frameId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(storyboardImages)
    .set({
      characterLibraryId: null,
      characterAppearance: null,
      consistencyScore: null,
      consistencyNotes: null,
      isConsistencyLocked: false,
    })
    .where(eq(storyboardImages.id, frameId));
}

/**
 * Get consistency report for a project
 */
export async function getProjectConsistencyReport(projectId: number): Promise<{
  totalFrames: number;
  framesWithCharacters: number;
  averageConsistencyScore: number;
  lockedFrames: number;
  inconsistentFrames: number;
  characterBreakdown: Array<{
    characterId: number;
    characterName: string;
    frameCount: number;
    averageScore: number;
  }>;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const frames = await db
    .select()
    .from(storyboardImages)
    .where(eq(storyboardImages.projectId, projectId));

  const framesWithCharacters = frames.filter((f: StoryboardImage) => f.characterLibraryId);
  const lockedFrames = frames.filter((f: StoryboardImage) => f.isConsistencyLocked).length;
  const inconsistentFrames = frames.filter(
    (f: StoryboardImage) => f.consistencyScore !== null && f.consistencyScore < 70
  ).length;

  const avgScore =
    framesWithCharacters.length > 0
      ? framesWithCharacters.reduce((sum: number, f: StoryboardImage) => sum + (f.consistencyScore || 0), 0) /
        framesWithCharacters.length
      : 0;

  // Group by character
  const characterMap = new Map<
    number,
    { frameCount: number; totalScore: number; characterName: string }
  >();

  framesWithCharacters.forEach((frame: StoryboardImage) => {
    if (frame.characterLibraryId) {
      const existing = characterMap.get(frame.characterLibraryId) || {
        frameCount: 0,
        totalScore: 0,
        characterName: `Character ${frame.characterLibraryId}`,
      };

      characterMap.set(frame.characterLibraryId, {
        frameCount: existing.frameCount + 1,
        totalScore: existing.totalScore + (frame.consistencyScore || 0),
        characterName: existing.characterName,
      });
    }
  });

  const characterBreakdown = Array.from(characterMap.entries()).map(([id, data]) => ({
    characterId: id,
    characterName: data.characterName,
    frameCount: data.frameCount,
    averageScore: data.frameCount > 0 ? data.totalScore / data.frameCount : 0,
  }));

  return {
    totalFrames: frames.length,
    framesWithCharacters: framesWithCharacters.length,
    averageConsistencyScore: Math.round(avgScore),
    lockedFrames,
    inconsistentFrames,
    characterBreakdown,
  };
}
