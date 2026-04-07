import { generatedVideos } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "../db";

export * from "../../drizzle/schema";

export async function getGeneratedVideos(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(generatedVideos).where(eq(generatedVideos.projectId, projectId));
}

export async function createGeneratedVideo(projectId: number, provider: string, modelId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(generatedVideos).values({ projectId, provider, modelId, status: "pending" });
  return result;
}

export async function updateGeneratedVideo(videoId: number, updates: { status?: string; videoUrl?: string; taskId?: string; error?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(generatedVideos).set(updates).where(eq(generatedVideos.id, videoId));
}