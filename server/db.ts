import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, projects, projectContent, storyboardImages, referenceImages, generatedVideos, editorProjects, editorClips, editorTracks, editorTransitions, editorExports, editorComments, InsertProjectContent, InsertReferenceImage, InsertGeneratedVideo, InsertEditorProject, InsertEditorClip, InsertEditorTrack, InsertEditorExport, InsertEditorComment, animaticConfigs, InsertAnimaticConfig, storyboardFrameOrder, storyboardFrameHistory, storyboardFrameNotes, InsertStoryboardFrameOrder, InsertStoryboardFrameHistory, InsertStoryboardFrameNotes } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createProject(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(projects).values({ userId, name });
  const projectId = result[0]?.insertId;
  
  if (projectId) {
    await db.insert(projectContent).values({ projectId });
  }
  
  return projectId;
}

export async function getUserProjects(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(projects).where(eq(projects.userId, userId));
}

export async function getProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return result[0];
}

export async function getProjectContent(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(projectContent).where(eq(projectContent.projectId, projectId)).limit(1);
  return result[0];
}

export async function updateProjectContent(projectId: number, data: Partial<InsertProjectContent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(projectContent).set(data).where(eq(projectContent.projectId, projectId));
}

export async function deleteProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(projects).where(eq(projects.id, projectId));
}

export async function getStoryboardImages(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(storyboardImages).where(eq(storyboardImages.projectId, projectId));
}

export async function saveStoryboardImage(projectId: number, shotNumber: number, imageUrl: string, prompt: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(storyboardImages).values({ projectId, shotNumber, imageUrl, prompt }).onDuplicateKeyUpdate({
    set: { imageUrl, prompt },
  });
}

export async function getReferenceImages(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(referenceImages).where(eq(referenceImages.projectId, projectId));
}

export async function saveReferenceImage(projectId: number, imageUrl: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(referenceImages).values({ projectId, imageUrl, description });
  return result;
}

export async function deleteReferenceImage(imageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(referenceImages).where(eq(referenceImages.id, imageId));
}

export async function getGeneratedVideos(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(generatedVideos).where(eq(generatedVideos.projectId, projectId));
}

export async function createGeneratedVideo(projectId: number, provider: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(generatedVideos).values({ projectId, provider, status: "pending" });
  return result;
}

export async function updateGeneratedVideo(videoId: number, updates: { status?: string; videoUrl?: string; taskId?: string; error?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(generatedVideos).set(updates).where(eq(generatedVideos.id, videoId));
}

// Video Editor Functions
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

export async function updateEditorClip(clipId: number, updates: Partial<InsertEditorClip>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(editorClips).set(updates).where(eq(editorClips.id, clipId));
}

export async function deleteEditorClip(clipId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(editorClips).where(eq(editorClips.id, clipId));
}

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


// Comments
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


// Animatic Configuration Functions
export async function getAnimaticConfig(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(animaticConfigs).where(eq(animaticConfigs.projectId, projectId));
  return result[0] || null;
}

export async function saveAnimaticConfig(projectId: number, config: Partial<InsertAnimaticConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getAnimaticConfig(projectId);
  
  if (existing) {
    await db.update(animaticConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(animaticConfigs.projectId, projectId));
  } else {
    await db.insert(animaticConfigs).values({
      projectId,
      ...config,
    });
  }
}

export async function updateFrameDurations(projectId: number, frameDurations: Record<number, number>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await saveAnimaticConfig(projectId, {
    frameDurations: JSON.stringify(frameDurations),
  });
}

export async function updateAnimaticAudio(projectId: number, audioUrl: string, audioVolume: number = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await saveAnimaticConfig(projectId, {
    audioUrl,
    audioVolume: Math.max(0, Math.min(100, audioVolume)),
  });
}


// Storyboard Reordering Functions
export async function getStoryboardFrameOrder(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(storyboardFrameOrder).where(eq(storyboardFrameOrder.projectId, projectId));
  return result.sort((a, b) => a.displayOrder - b.displayOrder);
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

// Storyboard Frame History Functions
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
  
  const maxVersion = Math.max(...existing.map(e => e.versionNumber), 0);
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

// Storyboard Frame Notes Functions
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


/**
 * Save storyboard image with character reference and seed
 */
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

/**
 * Get storyboard image with character reference
 */
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

/**
 * Get character reference from first shot (for consistency across all shots)
 */
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

// ============================================================================
// BRAND MANAGEMENT FUNCTIONS
// ============================================================================

import { brands, characters } from "../drizzle/schema";

/**
 * Create a new brand for a user
 */
export async function createBrand(
  userId: number,
  name: string,
  targetCustomer?: string,
  aesthetic?: string,
  mission?: string,
  coreMessaging?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(brands).values({
    userId,
    name,
    targetCustomer,
    aesthetic,
    mission,
    coreMessaging,
  });

  return result[0].insertId;
}

/**
 * Get brand by ID
 */
export async function getBrand(brandId: number) {
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

/**
 * Get all brands for a user
 */
export async function getUserBrands(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(brands)
    .where(eq(brands.userId, userId));

  return result.map((brand) => ({
    ...brand,
    productReferenceImages: brand.productReferenceImages
      ? JSON.parse(brand.productReferenceImages)
      : [],
    colorPalette: brand.colorPalette ? JSON.parse(brand.colorPalette) : {},
  }));
}

/**
 * Update brand
 */
export async function updateBrand(
  brandId: number,
  data: Partial<{
    name: string;
    logoUrl: string;
    productReferenceImages: string[];
    brandVoice: string;
    visualIdentity: string;
    colorPalette: Record<string, string>;
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

  await db.update(brands).set(updateData).where(eq(brands.id, brandId));
}

/**
 * Delete brand
 */
export async function deleteBrand(brandId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(brands).where(eq(brands.id, brandId));
}

// ============================================================================
// CHARACTER MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create a character for a project
 */
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

/**
 * Get character by ID
 */
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

/**
 * Get all characters for a project
 */
export async function getProjectCharacters(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(characters)
    .where(eq(characters.projectId, projectId));
}

/**
 * Get locked character for a project
 */
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

/**
 * Lock a character for a project (only one locked per project)
 */
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

/**
 * Unlock all characters for a project
 */
export async function unlockAllCharacters(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(characters)
    .set({ isLocked: false })
    .where(eq(characters.projectId, projectId));
}

/**
 * Update character
 */
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

/**
 * Delete character
 */
export async function deleteCharacter(characterId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(characters).where(eq(characters.id, characterId));
}

/**
 * Update storyboard image video URL
 */
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
