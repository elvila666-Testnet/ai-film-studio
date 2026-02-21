import { users, projects, projectContent, storyboardImages, referenceImages, generatedVideos, editorProjects, editorClips, editorTracks, editorExports, editorComments, animaticConfigs, storyboardFrameOrder, storyboardFrameHistory, storyboardFrameNotes, modelConfigs, userModelFavorites, brands, characters, InsertUser, InsertProjectContent, InsertEditorProject, InsertEditorClip, InsertEditorTrack, InsertEditorExport, InsertEditorComment, InsertAnimaticConfig, InsertModelConfig, InsertUserModelFavorite } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

import { getDb } from "../db";

import * as schema from "../../drizzle/schema";

export * from "../../drizzle/schema";

export async function getAnimaticConfig(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(animaticConfigs).where(eq(animaticConfigs.projectId, projectId));
  return result[0] || null;
}

export async function saveAnimaticConfig(projectId: number, config: Partial<InsertAnimaticConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getAnimaticConfig(projectId);

  if (existing) {
    await db.update(animaticConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(animaticConfigs.projectId, projectId));
  } else {
    await db.insert(animaticConfigs).values({
      projectId,
      ...config,
    });
  }
}

export async function updateFrameDurations(projectId: number, frameDurations: Record<number, number>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await saveAnimaticConfig(projectId, {
    frameDurations: JSON.stringify(frameDurations),
  });
}

export async function updateAnimaticAudio(projectId: number, audioUrl: string, audioVolume: number = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await saveAnimaticConfig(projectId, {
    audioUrl,
    audioVolume: Math.max(0, Math.min(100, audioVolume)),
  });
}