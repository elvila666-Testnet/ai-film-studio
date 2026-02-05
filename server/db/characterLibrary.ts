/**
 * Character Library Database Functions
 * Manages character libraries per brand with auto-suggestion capabilities
 */

import { getDb } from "../db";
import { characterLibrary, CharacterLibrary, InsertCharacterLibrary } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Create a new character in the brand library
 */
export async function createCharacterInLibrary(
  brandId: number,
  data: Omit<InsertCharacterLibrary, "brandId" | "createdAt" | "updatedAt" | "usageCount">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(characterLibrary).values({
    ...data,
    brandId,
    usageCount: 0,
  });

  return result[0].insertId;
}

/**
 * Get all characters in a brand library
 */
export async function getBrandCharacterLibrary(brandId: number): Promise<CharacterLibrary[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(characterLibrary).where(eq(characterLibrary.brandId, brandId));
}

/**
 * Get a specific character from the library
 */
export async function getCharacterFromLibrary(characterId: number): Promise<CharacterLibrary | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(characterLibrary)
    .where(eq(characterLibrary.id, characterId));

  return result[0] || null;
}

/**
 * Update a character in the library
 */
export async function updateCharacterInLibrary(
  characterId: number,
  data: Partial<Omit<CharacterLibrary, "id" | "brandId" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(characterLibrary)
    .set(data)
    .where(eq(characterLibrary.id, characterId));
}

/**
 * Delete a character from the library
 */
export async function deleteCharacterFromLibrary(characterId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(characterLibrary).where(eq(characterLibrary.id, characterId));
}

/**
 * Lock a character to prevent deviation
 */
export async function lockCharacterInLibrary(characterId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(characterLibrary)
    .set({ isLocked: true })
    .where(eq(characterLibrary.id, characterId));
}

/**
 * Unlock a character
 */
export async function unlockCharacterInLibrary(characterId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(characterLibrary)
    .set({ isLocked: false })
    .where(eq(characterLibrary.id, characterId));
}

/**
 * Increment usage count for a character
 */
export async function incrementCharacterUsage(characterId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const character = await getCharacterFromLibrary(characterId);
  if (!character) return;

  await db
    .update(characterLibrary)
    .set({ usageCount: (character.usageCount || 0) + 1 })
    .where(eq(characterLibrary.id, characterId));
}

/**
 * Get locked characters for a brand (brand enforcement)
 */
export async function getLockedCharactersForBrand(brandId: number): Promise<CharacterLibrary[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(characterLibrary)
    .where(and(eq(characterLibrary.brandId, brandId), eq(characterLibrary.isLocked, true)));
}

/**
 * Get most used characters for a brand (for suggestions)
 */
export async function getMostUsedCharactersForBrand(
  brandId: number,
  limit: number = 5
): Promise<CharacterLibrary[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(characterLibrary)
    .where(eq(characterLibrary.brandId, brandId))
    .orderBy((t: any) => t.usageCount)
    .limit(limit);
}
