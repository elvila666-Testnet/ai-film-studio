import { brands, brandAssets } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
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
    productReferenceImages: typeof brand.productReferenceImages === "string"
      ? JSON.parse(brand.productReferenceImages)
      : (brand.productReferenceImages || []),
    colorPalette: typeof brand.colorPalette === "string"
      ? JSON.parse(brand.colorPalette)
      : (brand.colorPalette || {}),
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
    productReferenceImages: typeof brand.productReferenceImages === "string"
      ? JSON.parse(brand.productReferenceImages)
      : (brand.productReferenceImages || []),
    colorPalette: typeof brand.colorPalette === "string"
      ? JSON.parse(brand.colorPalette)
      : (brand.colorPalette || {}),
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

export async function getBrandAssets(brandId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(brandAssets)
    .where(eq(brandAssets.brandId, brandId));
}

export async function addBrandAsset(
  brandId: string,
  assetType: "PDF" | "URL" | "IMG",
  gcsPath: string,
  description?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(brandAssets).values({
    brandId,
    assetType,
    gcsPath,
    description,
  });
}

export async function deleteBrandAsset(assetId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(brandAssets).where(eq(brandAssets.id, assetId));
}