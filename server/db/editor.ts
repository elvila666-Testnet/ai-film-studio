import { users, projects, projectContent, storyboardImages, referenceImages, generatedVideos, editorProjects, editorClips, editorTracks, editorExports, editorComments, animaticConfigs, storyboardFrameOrder, storyboardFrameHistory, storyboardFrameNotes, modelConfigs, userModelFavorites, brands, characters, InsertUser, InsertProjectContent, InsertEditorProject, InsertEditorClip, InsertEditorTrack, InsertEditorExport, InsertEditorComment, InsertAnimaticConfig, InsertModelConfig, InsertUserModelFavorite } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

import { getDb } from "../db";

import * as schema from "../../drizzle/schema";

export * from "../../drizzle/schema";

export async function createEditorProject(projectId: number, data: InsertEditorProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(editorProjects).values({ ...data, projectId });
  return result;
}

export async function getEditorProject(editorProjectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(editorProjects).where(eq(editorProjects.id, editorProjectId)).limit(1);
}

export async function getEditorProjectsByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(editorProjects).where(eq(editorProjects.projectId, projectId));
}

export async function createEditorClip(data: InsertEditorClip) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(editorClips).values(data);
  return result;
}

export async function getEditorClips(editorProjectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(editorClips).where(eq(editorClips.editorProjectId, editorProjectId));
}

export async function updateEditorClip(clipId: number, updates: Partial<InsertEditorClip>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(editorClips).set(updates).where(eq(editorClips.id, clipId));
}

export async function deleteEditorClip(clipId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(editorClips).where(eq(editorClips.id, clipId));
}

export async function createEditorTrack(data: InsertEditorTrack) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(editorTracks).values(data);
  return result;
}

export async function getEditorTracks(editorProjectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(editorTracks).where(eq(editorTracks.editorProjectId, editorProjectId));
}

export async function createEditorExport(data: InsertEditorExport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(editorExports).values(data);
  return result;
}

export async function getEditorExports(editorProjectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(editorExports).where(eq(editorExports.editorProjectId, editorProjectId));
}

export async function updateEditorExport(exportId: number, updates: { status?: string; exportUrl?: string; error?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(editorExports).set(updates).where(eq(editorExports.id, exportId));
}

export async function createComment(data: InsertEditorComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(editorComments).values(data);
  return result;
}

export async function getClipComments(clipId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(editorComments).where(eq(editorComments.clipId, clipId));
}

export async function updateComment(commentId: number, updates: { content?: string; resolved?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(editorComments).set(updates).where(eq(editorComments.id, commentId));
}

export async function deleteComment(commentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(editorComments).where(eq(editorComments.id, commentId));
}