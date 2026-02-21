import { users, projects, projectContent, storyboardImages, referenceImages, generatedVideos, editorProjects, editorClips, editorTracks, editorExports, editorComments, animaticConfigs, storyboardFrameOrder, storyboardFrameHistory, storyboardFrameNotes, modelConfigs, userModelFavorites, brands, characters, InsertUser, InsertProjectContent, InsertEditorProject, InsertEditorClip, InsertEditorTrack, InsertEditorExport, InsertEditorComment, InsertAnimaticConfig, InsertModelConfig, InsertUserModelFavorite } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

import { getDb } from "../db";

import * as schema from "../../drizzle/schema";

export * from "../../drizzle/schema";

export async function createCharacter(
  projectId: number,
  data: {
    name: string;
    description: string;
    imageUrl: string;
    isHero: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(characters).values({
    projectId,
    name: data.name,
    description: data.description,
    imageUrl: data.imageUrl,
    isHero: data.isHero,
    isLocked: false,
  });

  return result[0].insertId;
}

export async function getCharacter(characterId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(characters)
    .where(eq(characters.id, characterId))
    .limit(1);

  return result[0] || null;
}

export async function getProjectCharacters(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(characters)
    .where(eq(characters.projectId, projectId));
}

export async function getLockedCharacter(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(characters)
    .where(
      and(
        eq(characters.projectId, projectId),
        eq(characters.isLocked, true)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function lockCharacter(projectId: number, characterId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Unlock all other characters
  await db
    .update(characters)
    .set({ isLocked: false })
    .where(eq(characters.projectId, projectId));

  // Lock the selected character
  await db
    .update(characters)
    .set({ isLocked: true })
    .where(eq(characters.id, characterId));
}

export async function unlockAllCharacters(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(characters)
    .set({ isLocked: false })
    .where(eq(characters.projectId, projectId));
}

export async function updateCharacter(
  characterId: number,
  data: Partial<{
    name: string;
    description: string;
    imageUrl: string;
    isHero: boolean;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.isHero !== undefined) updateData.isHero = data.isHero;

  await db
    .update(characters)
    .set(updateData)
    .where(eq(characters.id, characterId));
}

export async function deleteCharacter(characterId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(characters).where(eq(characters.id, characterId));
}