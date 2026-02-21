import { users, projects, projectContent, storyboardImages, referenceImages, generatedVideos, editorProjects, editorClips, editorTracks, editorExports, editorComments, animaticConfigs, storyboardFrameOrder, storyboardFrameHistory, storyboardFrameNotes, modelConfigs, userModelFavorites, brands, characters, InsertUser, InsertProjectContent, InsertEditorProject, InsertEditorClip, InsertEditorTrack, InsertEditorExport, InsertEditorComment, InsertAnimaticConfig, InsertModelConfig, InsertUserModelFavorite } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

import { getDb } from "../db";

import * as schema from "../../drizzle/schema";

export * from "../../drizzle/schema";

export async function getReferenceImages(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(referenceImages).where(eq(referenceImages.projectId, projectId));
}

export async function saveReferenceImage(projectId: number, imageUrl: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(referenceImages).values({ projectId, imageUrl, description });
  return result;
}

export async function deleteReferenceImage(imageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(referenceImages).where(eq(referenceImages.id, imageId));
}