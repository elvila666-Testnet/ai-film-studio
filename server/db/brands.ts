import { users, projects, projectContent, storyboardImages, referenceImages, generatedVideos, editorProjects, editorClips, editorTracks, editorExports, editorComments, animaticConfigs, storyboardFrameOrder, storyboardFrameHistory, storyboardFrameNotes, modelConfigs, userModelFavorites, brands, characters, InsertUser, InsertProjectContent, InsertEditorProject, InsertEditorClip, InsertEditorTrack, InsertEditorExport, InsertEditorComment, InsertAnimaticConfig, InsertModelConfig, InsertUserModelFavorite } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

import { getDb } from "../db";

import * as schema from "../../drizzle/schema";

export * from "../../drizzle/schema";

import { randomUUID } from "node:crypto";

export async function createBrand(
  userId: number,
  name: string,
  targetAudience?: string,
  aesthetic?: string,
  mission?: string,
  coreMessaging?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const brandId = randomUUID();
  await db.insert(brands).values({
    id: brandId,
    userId,
    name,
    targetAudience,
    aesthetic,
    mission,
    coreMessaging,
  });

  return brandId;
}

export async function getBrand(brandId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1);

  if (result.length === 0) return null;

  const brand = result[0];
  return {
    ...brand,
    productReferenceImages: brand.productReferenceImages
      ? JSON.parse(brand.productReferenceImages)
      : [],
    colorPalette: brand.colorPalette ? JSON.parse(brand.colorPalette) : {},
  };
}

export async function getUserBrands(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(brands)
    .where(eq(brands.userId, userId));

  return result.map((brand: any) => ({
    ...brand,
    productReferenceImages: brand.productReferenceImages
      ? JSON.parse(brand.productReferenceImages)
      : [],
    colorPalette: brand.colorPalette ? JSON.parse(brand.colorPalette) : {},
  }));
}

export async function updateBrand(
  brandId: string,
  data: Partial<{
    name: string;
    logoUrl: string;
    productReferenceImages: string[];
    brandVoice: string;
    visualIdentity: string;
    colorPalette: Record<string, any>;
    targetAudience: string;
    negativeConstraints: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
  if (data.productReferenceImages !== undefined)
    updateData.productReferenceImages = JSON.stringify(
      data.productReferenceImages
    );
  if (data.brandVoice !== undefined) updateData.brandVoice = data.brandVoice;
  if (data.visualIdentity !== undefined)
    updateData.visualIdentity = data.visualIdentity;
  if (data.colorPalette !== undefined)
    updateData.colorPalette = JSON.stringify(data.colorPalette);

  if (data.targetAudience !== undefined) updateData.targetAudience = data.targetAudience;
  if (data.negativeConstraints !== undefined) updateData.negativeConstraints = data.negativeConstraints;

  await db.update(brands).set(updateData).where(eq(brands.id, brandId));
}

export async function deleteBrand(brandId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(brands).where(eq(brands.id, brandId));
}