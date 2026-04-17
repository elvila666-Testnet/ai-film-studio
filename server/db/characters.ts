import { characters } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";

export * from "../../drizzle/schema";

export async function createCharacter(
  projectId: number,
  data: {
    name: string;
    description: string;
    imageUrl: string;
    referenceImageUrl?: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(characters).values({
    projectId,
    name: data.name,
    description: data.description,
    imageUrl: data.imageUrl,
    referenceImageUrl: data.referenceImageUrl,
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

/**
 * getLockedCharacter - Legacy helper. 
 * Since isLocked was removed from characters, we return the first available project character 
 * to maintain compatibility with storyboard generation anchors.
 */
export async function getLockedCharacter(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(characters)
    .where(eq(characters.projectId, projectId))
    .limit(1);

  return result[0] || null;
}

/**
 * getLockedCharacters - Returns all project characters to serve as visual anchors.
 * isLocked column was dropped in migration 0011.
 */
export async function getLockedCharacters(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(characters)
    .where(eq(characters.projectId, projectId));
}

export async function lockCharacter(projectId: number, characterId: number) {
  // logic removed as isLocked column is dropped
}

export async function unlockAllCharacters(projectId: number) {
  // logic removed as isLocked column is dropped
}

export async function updateCharacter(
  characterId: number,
  data: Partial<{
    name: string;
    description: string;
    imageUrl: string;
    referenceImageUrl: string | null;
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
  if (data.referenceImageUrl !== undefined) updateData.referenceImageUrl = data.referenceImageUrl;

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