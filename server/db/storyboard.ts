import { users, projects, projectContent, storyboardImages, referenceImages, generatedVideos, editorProjects, editorClips, editorTracks, editorExports, editorComments, animaticConfigs, storyboardFrameOrder, storyboardFrameHistory, storyboardFrameNotes, modelConfigs, userModelFavorites, brands, characters, InsertUser, InsertProjectContent, InsertEditorProject, InsertEditorClip, InsertEditorTrack, InsertEditorExport, InsertEditorComment, InsertAnimaticConfig, InsertModelConfig, InsertUserModelFavorite } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

import { getDb } from "../db";

import * as schema from "../../drizzle/schema";

export * from "../../drizzle/schema";

export async function getStoryboardImages(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(storyboardImages).where(eq(storyboardImages.projectId, projectId));
}

export async function saveStoryboardImage(projectId: number, shotNumber: number, imageUrl: string, prompt: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Manual upsert to handle missing unique constraint
  // We assume default variant 0 for now as previously implemented
  const existing = await db.select().from(storyboardImages).where(and(
    eq(storyboardImages.projectId, projectId),
    eq(storyboardImages.shotNumber, shotNumber),
    eq(storyboardImages.generationVariant, 0)
  )).limit(1);

  if (existing.length > 0) {
    await db.update(storyboardImages).set({ imageUrl, prompt }).where(eq(storyboardImages.id, existing[0].id));
  } else {
    await db.insert(storyboardImages).values({ projectId, shotNumber, imageUrl, prompt, generationVariant: 0 });
  }
}

export async function updateStoryboardImageVideoUrl(storyboardImageId: number, videoUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(storyboardImages).set({ videoUrl }).where(eq(storyboardImages.id, storyboardImageId));
}

export async function updateStoryboardImageStatus(storyboardImageId: number, status: 'draft' | 'approved', masterImageUrl?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(storyboardImages).set({
    status,
    ...(masterImageUrl ? { masterImageUrl } : {})
  }).where(eq(storyboardImages.id, storyboardImageId));
}

export async function getStoryboardImageById(storyboardImageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(storyboardImages).where(eq(storyboardImages.id, storyboardImageId)).limit(1);
  return result[0] || null;
}

export async function saveStoryboardImageWithConsistency(
  projectId: number,
  shotNumber: number,
  imageUrl: string,
  prompt: string,
  characterReference?: Record<string, string>,
  seed?: number,
  generationVariant?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(storyboardImages)
    .where(and(eq(storyboardImages.projectId, projectId), eq(storyboardImages.shotNumber, shotNumber)))
    .limit(1);

  if (existing.length > 0) {
    return await db
      .update(storyboardImages)
      .set({
        imageUrl,
        prompt,
        characterReference: characterReference ? JSON.stringify(characterReference) : null,
        seed,
        generationVariant,
      })
      .where(eq(storyboardImages.id, existing[0].id));
  }

  return await db.insert(storyboardImages).values({
    projectId,
    shotNumber,
    imageUrl,
    prompt,
    characterReference: characterReference ? JSON.stringify(characterReference) : null,
    seed,
    generationVariant,
  });
}

export async function getStoryboardImageWithConsistency(
  projectId: number,
  shotNumber: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(storyboardImages)
    .where(and(eq(storyboardImages.projectId, projectId), eq(storyboardImages.shotNumber, shotNumber)))
    .limit(1);

  if (result.length === 0) return null;

  const image = result[0];
  return {
    ...image,
    characterReference: image.characterReference ? JSON.parse(image.characterReference) : null,
  };
}

export async function getProjectCharacterReference(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const firstShot = await db
    .select()
    .from(storyboardImages)
    .where(eq(storyboardImages.projectId, projectId))
    .limit(1);

  if (firstShot.length === 0 || !firstShot[0].characterReference) {
    return null;
  }

  return JSON.parse(firstShot[0].characterReference);
}

export async function getStoryboardFrameOrder(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(storyboardFrameOrder).where(eq(storyboardFrameOrder.projectId, projectId));
  return result.sort((a: any, b: any) => a.displayOrder - b.displayOrder);
}

export async function updateFrameOrder(projectId: number, frameOrders: Array<{ shotNumber: number; displayOrder: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete existing orders for this project
  await db.delete(storyboardFrameOrder).where(eq(storyboardFrameOrder.projectId, projectId));

  // Insert new orders
  for (const order of frameOrders) {
    await db.insert(storyboardFrameOrder).values({
      projectId,
      shotNumber: order.shotNumber,
      displayOrder: order.displayOrder,
    });
  }
}

export async function getFrameHistory(projectId: number, shotNumber: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(storyboardFrameHistory)
    .where(and(eq(storyboardFrameHistory.projectId, projectId), eq(storyboardFrameHistory.shotNumber, shotNumber)))
    .orderBy(storyboardFrameHistory.versionNumber);
  return result;
}

export async function createFrameHistoryVersion(projectId: number, shotNumber: number, imageUrl: string, prompt: string, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current max version
  const existing = await db.select().from(storyboardFrameHistory)
    .where(and(eq(storyboardFrameHistory.projectId, projectId), eq(storyboardFrameHistory.shotNumber, shotNumber)));

  const maxVersion = Math.max(...existing.map((e: any) => e.versionNumber), 0);
  const newVersion = maxVersion + 1;

  // Mark previous active as inactive
  if (existing.length > 0) {
    await db.update(storyboardFrameHistory)
      .set({ isActive: false })
      .where(and(eq(storyboardFrameHistory.projectId, projectId), eq(storyboardFrameHistory.shotNumber, shotNumber)));
  }

  // Insert new version as active
  await db.insert(storyboardFrameHistory).values({
    projectId,
    shotNumber,
    imageUrl,
    prompt,
    notes,
    versionNumber: newVersion,
    isActive: true,
  });
}

export async function getFrameNotes(projectId: number, shotNumber: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(storyboardFrameNotes)
    .where(and(eq(storyboardFrameNotes.projectId, projectId), eq(storyboardFrameNotes.shotNumber, shotNumber)));
  return result[0] || null;
}

export async function saveFrameNotes(projectId: number, shotNumber: number, notes: string, metadata?: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getFrameNotes(projectId, shotNumber);

  if (existing) {
    await db.update(storyboardFrameNotes)
      .set({
        notes,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(storyboardFrameNotes.projectId, projectId), eq(storyboardFrameNotes.shotNumber, shotNumber)));
  } else {
    await db.insert(storyboardFrameNotes).values({
      projectId,
      shotNumber,
      notes,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
  }
}

export async function deleteFrameNotes(projectId: number, shotNumber: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(storyboardFrameNotes)
    .where(and(eq(storyboardFrameNotes.projectId, projectId), eq(storyboardFrameNotes.shotNumber, shotNumber)));
}

export async function updateStoryboardVideo(
  projectId: number,
  shotNumber: number,
  videoUrl: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(storyboardImages)
    .set({ videoUrl })
    .where(
      and(
        eq(storyboardImages.projectId, projectId),
        eq(storyboardImages.shotNumber, shotNumber)
      )
    );
}

export async function deleteStoryboardVideo(
  projectId: number,
  shotNumber: number
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(storyboardImages)
    .set({ videoUrl: null })
    .where(
      and(
        eq(storyboardImages.projectId, projectId),
        eq(storyboardImages.shotNumber, shotNumber)
      )
    );
}