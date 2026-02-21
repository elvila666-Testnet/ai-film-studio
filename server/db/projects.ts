import { users, projects, projectContent, storyboardImages, referenceImages, generatedVideos, editorProjects, editorClips, editorTracks, editorExports, editorComments, animaticConfigs, storyboardFrameOrder, storyboardFrameHistory, storyboardFrameNotes, modelConfigs, userModelFavorites, brands, characters, InsertUser, InsertProjectContent, InsertEditorProject, InsertEditorClip, InsertEditorTrack, InsertEditorExport, InsertEditorComment, InsertAnimaticConfig, InsertModelConfig, InsertUserModelFavorite } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

import { getDb } from "../db";

import * as schema from "../../drizzle/schema";

export * from "../../drizzle/schema";

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

  return db
    .select({
      id: projects.id,
      userId: projects.userId,
      brandId: projects.brandId,
      name: projects.name,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      bible: projects.bible,
      scriptComplianceScore: projectContent.scriptComplianceScore,
      visualComplianceScore: projectContent.visualComplianceScore,
      storyboardComplianceScore: projectContent.storyboardComplianceScore,
      voiceoverComplianceScore: projectContent.voiceoverComplianceScore,
    })
    .from(projects)
    .leftJoin(projectContent, eq(projects.id, projectContent.projectId))
    .where(eq(projects.userId, userId));
}

export async function getProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log(`[DB] getProject called for id: ${projectId}`);
  const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  console.log(`[DB] getProject result:`, result[0] ? "Found" : "Not Found");
  return result[0];
}

export async function getProjectContent(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log(`[DB] getProjectContent called for id: ${projectId}`);
  const result = await db.select().from(projectContent).where(eq(projectContent.projectId, projectId)).limit(1);

  if (result.length === 0) {
    console.log(`[DB] getProjectContent: Missing content for project ${projectId}. Auto-creating.`);
    await db.insert(projectContent).values({ projectId });
    // Fetch again to return the new row with defaults
    const newResult = await db.select().from(projectContent).where(eq(projectContent.projectId, projectId)).limit(1);
    return newResult[0];
  }

  console.log(`[DB] getProjectContent result: Found`);
  return result[0];
}

export async function updateProjectContent(projectId: number, data: Partial<InsertProjectContent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if content exists
  const existing = await db.select().from(projectContent).where(eq(projectContent.projectId, projectId)).limit(1);

  if (existing.length === 0) {
    // If not exists, insert new row
    await db.insert(projectContent).values({ projectId, ...data });
  } else {
    // If exists, update
    await db.update(projectContent).set(data).where(eq(projectContent.projectId, projectId));
  }
}

export async function deleteProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(projects).where(eq(projects.id, projectId));
}

export async function setProjectBrand(projectId: number, brandId: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projects).set({ brandId }).where(eq(projects.id, projectId));
}