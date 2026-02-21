/**
 * Brand Voice Profile Database Functions
 * Manages ElevenLabs voice profiles per brand
 */

import { getDb } from "../db";
import {
  brandVoiceProfiles,
  generatedVoiceovers,
  BrandVoiceProfile,
  GeneratedVoiceover,
  InsertBrandVoiceProfile,
  InsertGeneratedVoiceover,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Create a new voice profile for a brand
 */
export async function createVoiceProfile(
  brandId: string,
  data: Omit<InsertBrandVoiceProfile, "brandId" | "createdAt" | "updatedAt">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // If this is the first voice profile, make it default
  const existingProfiles = await getBrandVoiceProfiles(brandId);
  const isDefault = existingProfiles.length === 0 || data.isDefault;

  const result = await db.insert(brandVoiceProfiles).values({
    ...data,
    brandId,
    isDefault,
  });

  return result[0].insertId;
}

/**
 * Get all voice profiles for a brand
 */
export async function getBrandVoiceProfiles(brandId: string): Promise<BrandVoiceProfile[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(brandVoiceProfiles).where(eq(brandVoiceProfiles.brandId, brandId));
}

/**
 * Get the default voice profile for a brand
 */
export async function getDefaultVoiceProfile(brandId: string): Promise<BrandVoiceProfile | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(brandVoiceProfiles)
    .where(and(eq(brandVoiceProfiles.brandId, brandId), eq(brandVoiceProfiles.isDefault, true)));

  return result[0] || null;
}

/**
 * Get a specific voice profile
 */
export async function getVoiceProfile(profileId: number): Promise<BrandVoiceProfile | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(brandVoiceProfiles)
    .where(eq(brandVoiceProfiles.id, profileId));

  return result[0] || null;
}

/**
 * Update a voice profile
 */
export async function updateVoiceProfile(
  profileId: number,
  data: Partial<Omit<BrandVoiceProfile, "id" | "brandId" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(brandVoiceProfiles).set(data).where(eq(brandVoiceProfiles.id, profileId));
}

/**
 * Set a voice profile as default for its brand
 */
export async function setDefaultVoiceProfile(profileId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const profile = await getVoiceProfile(profileId);
  if (!profile) return;

  // Unset all other defaults for this brand
  await db
    .update(brandVoiceProfiles)
    .set({ isDefault: false })
    .where(eq(brandVoiceProfiles.brandId, profile.brandId));

  // Set this one as default
  await db.update(brandVoiceProfiles).set({ isDefault: true }).where(eq(brandVoiceProfiles.id, profileId));
}

/**
 * Delete a voice profile
 */
export async function deleteVoiceProfile(profileId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(brandVoiceProfiles).where(eq(brandVoiceProfiles.id, profileId));
}

/**
 * Create a generated voiceover record
 */
export async function createGeneratedVoiceover(
  data: InsertGeneratedVoiceover
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(generatedVoiceovers).values(data);

  return result[0].insertId;
}

/**
 * Get voiceovers for a project
 */
export async function getProjectVoiceovers(projectId: number): Promise<GeneratedVoiceover[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(generatedVoiceovers).where(eq(generatedVoiceovers.projectId, projectId));
}

/**
 * Get a specific voiceover
 */
export async function getVoiceover(voiceoverId: number): Promise<GeneratedVoiceover | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(generatedVoiceovers)
    .where(eq(generatedVoiceovers.id, voiceoverId));

  return result[0] || null;
}

/**
 * Update a voiceover record
 */
export async function updateVoiceover(
  voiceoverId: number,
  data: Partial<Omit<GeneratedVoiceover, "id" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(generatedVoiceovers).set(data).where(eq(generatedVoiceovers.id, voiceoverId));
}

/**
 * Delete a voiceover
 */
export async function deleteVoiceover(voiceoverId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(generatedVoiceovers).where(eq(generatedVoiceovers.id, voiceoverId));
}

/**
 * Get voiceovers by voice profile
 */
export async function getVoiceoversForProfile(voiceProfileId: number): Promise<GeneratedVoiceover[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(generatedVoiceovers)
    .where(eq(generatedVoiceovers.voiceProfileId, voiceProfileId));
}

/**
 * Get voiceovers for a specific language
 */
export async function getVoiceoversForLanguage(
  projectId: number,
  language: string
): Promise<GeneratedVoiceover[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(generatedVoiceovers)
    .where(and(eq(generatedVoiceovers.projectId, projectId), eq(generatedVoiceovers.language, language)));
}
