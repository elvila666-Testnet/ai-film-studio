/**
 * Moodboard Database Functions
 * Manages visual reference galleries per brand with AI analysis
 */

import { getDb } from "../db";
import {
  moodboards,
  moodboardImages,
  Moodboard,
  MoodboardImage,
  InsertMoodboard,
  InsertMoodboardImage,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Create a new moodboard for a brand
 */
export async function createMoodboard(
  brandId: number,
  data: Omit<InsertMoodboard, "brandId" | "createdAt" | "updatedAt">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(moodboards).values({
    ...data,
    brandId,
  });

  return result[0].insertId;
}

/**
 * Get all moodboards for a brand
 */
export async function getBrandMoodboards(brandId: number): Promise<Moodboard[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(moodboards).where(eq(moodboards.brandId, brandId));
}

/**
 * Get a specific moodboard
 */
export async function getMoodboard(moodboardId: number): Promise<Moodboard | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(moodboards).where(eq(moodboards.id, moodboardId));

  return result[0] || null;
}

/**
 * Update a moodboard
 */
export async function updateMoodboard(
  moodboardId: number,
  data: Partial<Omit<Moodboard, "id" | "brandId" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(moodboards).set(data).where(eq(moodboards.id, moodboardId));
}

/**
 * Delete a moodboard
 */
export async function deleteMoodboard(moodboardId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(moodboards).where(eq(moodboards.id, moodboardId));
}

/**
 * Add an image to a moodboard
 */
export async function addMoodboardImage(
  moodboardId: number,
  data: Omit<InsertMoodboardImage, "moodboardId" | "createdAt">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(moodboardImages).values({
    ...data,
    moodboardId,
  });

  return result[0].insertId;
}

/**
 * Get all images in a moodboard
 */
export async function getMoodboardImages(moodboardId: number): Promise<MoodboardImage[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(moodboardImages).where(eq(moodboardImages.moodboardId, moodboardId));
}

/**
 * Get a specific moodboard image
 */
export async function getMoodboardImage(imageId: number): Promise<MoodboardImage | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(moodboardImages)
    .where(eq(moodboardImages.id, imageId));

  return result[0] || null;
}

/**
 * Update a moodboard image with AI analysis results
 */
export async function updateMoodboardImage(
  imageId: number,
  data: Partial<Omit<MoodboardImage, "id" | "moodboardId" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(moodboardImages).set(data).where(eq(moodboardImages.id, imageId));
}

/**
 * Delete a moodboard image
 */
export async function deleteMoodboardImage(imageId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(moodboardImages).where(eq(moodboardImages.id, imageId));
}

/**
 * Get aggregated color palette from all moodboard images
 */
export async function getAggregatedColorPalette(moodboardId: number): Promise<Record<string, any>> {
  const db = await getDb();
  if (!db) return {};

  const images = await getMoodboardImages(moodboardId);

  const colorPalettes = images
    .filter((img) => img.colorPalette)
    .map((img) => JSON.parse(img.colorPalette || "{}"));

  if (colorPalettes.length === 0) return {};

  // Aggregate color frequencies
  const aggregated: Record<string, number> = {};
  colorPalettes.forEach((palette) => {
    Object.entries(palette).forEach(([color, frequency]) => {
      aggregated[color] = (aggregated[color] || 0) + (frequency as number);
    });
  });

  return aggregated;
}

/**
 * Get aggregated composition analysis from all moodboard images
 */
export async function getAggregatedComposition(moodboardId: number): Promise<Record<string, any>> {
  const db = await getDb();
  if (!db) return {};

  const images = await getMoodboardImages(moodboardId);

  const compositions = images
    .filter((img) => img.composition)
    .map((img) => JSON.parse(img.composition || "{}"));

  if (compositions.length === 0) return {};

  // Aggregate composition patterns
  const aggregated: Record<string, number> = {};
  compositions.forEach((comp) => {
    Object.entries(comp).forEach(([pattern, count]) => {
      aggregated[pattern] = (aggregated[pattern] || 0) + (count as number);
    });
  });

  return aggregated;
}

/**
 * Get most common styles from moodboard
 */
export async function getMoodboardStyles(moodboardId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  const images = await getMoodboardImages(moodboardId);

  const styleFrequency: Record<string, number> = {};
  images.forEach((img) => {
    if (img.style) {
      const styles = img.style.split(",").map((s) => s.trim());
      styles.forEach((style) => {
        styleFrequency[style] = (styleFrequency[style] || 0) + 1;
      });
    }
  });

  return Object.entries(styleFrequency)
    .sort(([, a], [, b]) => b - a)
    .map(([style]) => style);
}
