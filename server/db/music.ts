/**
 * Music Library Database Helpers
 * CRUD operations for music management, suggestions, and project selections
 */

import { getDb } from "../db";

// Helper to safely get database instance
async function getDatabase() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}
import {
  musicLibrary,
  brandMusicPreferences,
  projectMusicSelections,
  musicSuggestions,
  MusicLibrary,
  BrandMusicPreferences,
  ProjectMusicSelection,
  MusicSuggestion,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Create a new music track in the library
 */
export async function createMusicTrack(
  brandId: number,
  data: {
    title: string;
    artist?: string;
    description?: string;
    audioUrl: string;
    duration?: number;
    genre?: string;
    mood?: string;
    tempo?: number;
    source?: string;
    sourceId?: string;
  }
): Promise<number> {
  const db = await getDatabase();
  const result = await db.insert(musicLibrary).values({
    brandId,
    ...data,
  });
  return result[0].insertId;
}

/**
 * Get all music tracks for a brand
 */
export async function getBrandMusicLibrary(brandId: number): Promise<MusicLibrary[]> {
  const db = await getDatabase();
  return db
    .select()
    .from(musicLibrary)
    .where(and(eq(musicLibrary.brandId, brandId), eq(musicLibrary.isActive, true)));
}

/**
 * Get a specific music track
 */
export async function getMusicTrack(musicId: number): Promise<MusicLibrary | undefined> {
  const db = await getDatabase();
  const result = await db.select().from(musicLibrary).where(eq(musicLibrary.id, musicId));
  return result[0];
}

/**
 * Update a music track
 */
export async function updateMusicTrack(
  musicId: number,
  data: Partial<Omit<MusicLibrary, "id" | "createdAt">>
): Promise<void> {
  const db = await getDatabase();
  await db.update(musicLibrary).set(data).where(eq(musicLibrary.id, musicId));
}

/**
 * Delete a music track (soft delete)
 */
export async function deleteMusicTrack(musicId: number): Promise<void> {
  const db = await getDatabase();
  await db
    .update(musicLibrary)
    .set({ isActive: false })
    .where(eq(musicLibrary.id, musicId));
}

/**
 * Get or create brand music preferences
 */
export async function getBrandMusicPreferences(
  brandId: number
): Promise<BrandMusicPreferences | undefined> {
  const db = await getDatabase();
  const result = await db
    .select()
    .from(brandMusicPreferences)
    .where(eq(brandMusicPreferences.brandId, brandId));
  return result[0];
}

/**
 * Update brand music preferences
 */
export async function updateBrandMusicPreferences(
  brandId: number,
  data: {
    preferredGenres?: string;
    preferredMoods?: string;
    tempoRange?: string;
    excludedGenres?: string;
    excludedArtists?: string;
  }
): Promise<void> {
  const db = await getDatabase();
  const existing = await getBrandMusicPreferences(brandId);

  if (existing) {
    await db
      .update(brandMusicPreferences)
      .set(data)
      .where(eq(brandMusicPreferences.brandId, brandId));
  } else {
    await db.insert(brandMusicPreferences).values({
      brandId,
      ...data,
    });
  }
}

/**
 * Add music to a project
 */
export async function addMusicToProject(
  projectId: number,
  musicId: number,
  data: {
    startTime?: number;
    duration?: number;
    volume?: number;
    fadeIn?: number;
    fadeOut?: number;
    notes?: string;
  }
): Promise<number> {
  const db = await getDatabase();
  const result = await db.insert(projectMusicSelections).values({
    projectId,
    musicId,
    ...data,
  });
  return result[0].insertId;
}

/**
 * Get all music selections for a project
 */
export async function getProjectMusicSelections(
  projectId: number
): Promise<ProjectMusicSelection[]> {
  const db = await getDatabase();
  return db
    .select()
    .from(projectMusicSelections)
    .where(eq(projectMusicSelections.projectId, projectId));
}

/**
 * Update music selection in project
 */
export async function updateProjectMusicSelection(
  selectionId: number,
  data: Partial<Omit<ProjectMusicSelection, "id" | "projectId" | "musicId" | "createdAt">>
): Promise<void> {
  const db = await getDatabase();
  await db
    .update(projectMusicSelections)
    .set(data)
    .where(eq(projectMusicSelections.id, selectionId));
}

/**
 * Remove music from project
 */
export async function removeMusicFromProject(selectionId: number): Promise<void> {
  const db = await getDatabase();
  await db.delete(projectMusicSelections).where(eq(projectMusicSelections.id, selectionId));
}

/**
 * Create a music suggestion for a project
 */
export async function createMusicSuggestion(
  projectId: number,
  musicId: number,
  data: {
    matchScore?: number;
    reasoning?: string;
    moodAlignment?: number;
    brandAlignment?: number;
    paceAlignment?: number;
  }
): Promise<number> {
  const db = await getDatabase();
  const result = await db.insert(musicSuggestions).values({
    projectId,
    musicId,
    ...data,
  });
  return result[0].insertId;
}

/**
 * Get music suggestions for a project
 */
export async function getProjectMusicSuggestions(projectId: number): Promise<MusicSuggestion[]> {
  const db = await getDatabase();
  return db
    .select()
    .from(musicSuggestions)
    .where(eq(musicSuggestions.projectId, projectId));
}

/**
 * Get top music suggestions for a project (sorted by match score)
 */
export async function getTopMusicSuggestions(
  projectId: number,
  limit: number = 5
): Promise<MusicSuggestion[]> {
  const db = await getDatabase();
  const suggestions = await db
    .select()
    .from(musicSuggestions)
    .where(eq(musicSuggestions.projectId, projectId));

  return suggestions
    .sort((a: MusicSuggestion, b: MusicSuggestion) => (b.matchScore || 0) - (a.matchScore || 0))
    .slice(0, limit);
}

/**
 * Increment usage count for a music track
 */
export async function incrementMusicUsage(musicId: number): Promise<void> {
  const db = await getDatabase();
  const track = await getMusicTrack(musicId);
  if (track) {
    await updateMusicTrack(musicId, {
      usageCount: (track.usageCount || 0) + 1,
    });
  }
}

/**
 * Get popular music tracks for a brand
 */
export async function getPopularMusicTracks(
  brandId: number,
  limit: number = 10
): Promise<MusicLibrary[]> {
  const db = await getDatabase();
  const tracks = await db
    .select()
    .from(musicLibrary)
    .where(and(eq(musicLibrary.brandId, brandId), eq(musicLibrary.isActive, true)));

  return tracks
    .sort((a: MusicLibrary, b: MusicLibrary) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, limit);
}

/**
 * Search music by mood and genre
 */
export async function searchMusicByMoodAndGenre(
  brandId: number,
  mood?: string,
  genre?: string
): Promise<MusicLibrary[]> {
  const db = await getDatabase();
  let query = db
    .select()
    .from(musicLibrary)
    .where(and(eq(musicLibrary.brandId, brandId), eq(musicLibrary.isActive, true)));

  const tracks = await query;

  return tracks.filter((track: MusicLibrary) => {
    if (mood && track.mood !== mood) return false;
    if (genre && track.genre !== genre) return false;
    return true;
  });
}
