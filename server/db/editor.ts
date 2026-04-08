import { editorProjects, editorClips, editorTracks, editorExports, editorComments, InsertEditorProject, InsertEditorClip, InsertEditorTrack, InsertEditorExport, InsertEditorComment } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "../db";

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

export async function getEditorClip(clipId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [clip] = await db.select().from(editorClips).where(eq(editorClips.id, clipId)).limit(1);
  return clip;
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

export async function getEditorTrack(trackId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [track] = await db.select().from(editorTracks).where(eq(editorTracks.id, trackId)).limit(1);
  return track;
}

export async function deleteEditorTrack(trackId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // First delete all clips on this track
  await db.delete(editorClips).where(eq(editorClips.trackId, trackId));
  // Then delete the track itself
  await db.delete(editorTracks).where(eq(editorTracks.id, trackId));
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
export async function deleteEditorTrack(trackId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(editorTracks).where(eq(editorTracks.id, trackId));
}

export async function splitEditorClip(clipId: number, splitTime: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const originalClip = await db.select().from(editorClips).where(eq(editorClips.id, clipId)).limit(1);

  if (originalClip.length === 0) {
    throw new Error("Original clip not found");
  }

  const clip = originalClip[0];

  // Calculate new duration for the first part
  const firstPartDuration = splitTime - clip.startTime;

  // Update the original clip (first part)
  await db.update(editorClips).set({ duration: firstPartDuration }).where(eq(editorClips.id, clipId));

  // Create a new clip for the second part
  const newClipData = {
    editorProjectId: clip.editorProjectId,
    trackId: clip.trackId,
    fileUrl: clip.fileUrl,
    fileName: `${clip.fileName} (Part 2)`,
    fileType: clip.fileType,
    duration: clip.duration - firstPartDuration,
    startTime: splitTime,
    order: clip.order + 1, // Place it right after the original clip
    trimStart: clip.trimStart + firstPartDuration, // Adjust trimStart for the new clip
    volume: clip.volume,
  };

  const result = await db.insert(editorClips).values(newClipData);
  return { success: true, newClipId: (result as any).insertId || 0 };
}
