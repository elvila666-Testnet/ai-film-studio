import { 
  editorProjects, 
  editorClips, 
  editorTracks, 
  editorExports, 
  editorComments, 
  editorKeyframes,
  editorTransitions,
  InsertEditorProject, 
  InsertEditorClip, 
  InsertEditorTrack, 
  InsertEditorExport, 
  InsertEditorComment,
  InsertEditorKeyframe,
  InsertEditorTransition
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";

export * from "../../drizzle/schema";

// --- Projects ---
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

// --- Clips ---
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

  // Cascade delete related keyframes and transitions if not handled by DB
  await db.delete(editorKeyframes).where(eq(editorKeyframes.clipId, clipId));
  await db.delete(editorTransitions).where(eq(editorTransitions.fromClipId, clipId));
  await db.delete(editorTransitions).where(eq(editorTransitions.toClipId, clipId));
  
  await db.delete(editorClips).where(eq(editorClips.id, clipId));
}

export async function splitEditorClip(clipId: number, splitTime: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [clip] = await db.select().from(editorClips).where(eq(editorClips.id, clipId)).limit(1);
  if (!clip) throw new Error("Original clip not found");

  const firstPartDuration = splitTime - clip.startTime;
  if (firstPartDuration <= 0 || firstPartDuration >= clip.duration) {
      throw new Error("Invalid split point");
  }

  // 1. Update first part
  await db.update(editorClips).set({ duration: firstPartDuration }).where(eq(editorClips.id, clipId));

  // 2. Create second part
  const newClipData: InsertEditorClip = {
    editorProjectId: clip.editorProjectId,
    trackId: clip.trackId,
    fileUrl: clip.fileUrl,
    fileName: `${clip.fileName} (Part 2)`,
    fileType: clip.fileType,
    duration: clip.duration - firstPartDuration,
    startTime: splitTime,
    order: (clip.order || 0) + 1,
    trimStart: (clip.trimStart || 0) + firstPartDuration,
    volume: clip.volume,
    effects: clip.effects,
    colorCorrection: clip.colorCorrection,
    textOverlay: clip.textOverlay,
  };

  const result = await db.insert(editorClips).values(newClipData);
  return { success: true, newClipId: (result as any).insertId || 0 };
}

// --- Tracks ---
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

  // First delete all clips on this track (cascading keyframes/transitions handled by deleteEditorClip)
  const clips = await db.select().from(editorClips).where(eq(editorClips.trackId, trackId));
  for (const clip of clips) {
      await deleteEditorClip(clip.id);
  }
  
  // Then delete the track itself
  await db.delete(editorTracks).where(eq(editorTracks.id, trackId));
}

// --- Keyframes ---
export async function createEditorKeyframe(data: InsertEditorKeyframe) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(editorKeyframes).values(data);
}

export async function getEditorKeyframes(clipId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(editorKeyframes).where(eq(editorKeyframes.clipId, clipId)).orderBy(editorKeyframes.time);
}

export async function deleteEditorKeyframe(keyframeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(editorKeyframes).where(eq(editorKeyframes.id, keyframeId));
}

// --- Transitions ---
export async function createEditorTransition(data: InsertEditorTransition) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(editorTransitions).values(data);
}

export async function getEditorTransitions(editorProjectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(editorTransitions).where(eq(editorTransitions.editorProjectId, editorProjectId));
}

// --- Exports ---
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

// --- Comments ---
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
