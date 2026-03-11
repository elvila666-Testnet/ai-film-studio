import { projects, projectContent, type InsertProjectContent } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

import { getDb } from "../db";

export * from "../../drizzle/schema";

export async function createProject(
  userId: number,
  name: string,
  type: "spot" | "movie" = "movie",
  targetDuration?: number,
  aspectRatio?: string,
  thumbnailUrl?: string,
  brief?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projects).values({
    userId,
    name,
    type,
    targetDuration,
    aspectRatio,
    thumbnailUrl
  } as any);
  const projectId = result[0]?.insertId;

  if (projectId) {
    await db.insert(projectContent).values({
      projectId,
      brief: brief || null
    });
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
    // Check if project exists before creating content
    const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (project.length === 0) {
      console.warn(`[DB] getProjectContent: Project ${projectId} does not exist. Cannot create content.`);
      return null;
    }

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

  if (!projectId) {
    console.warn(`[DB] updateProjectContent called without valid projectId: ${projectId}`);
    return;
  }

  // Check if content exists
  const existing = await db.select().from(projectContent).where(eq(projectContent.projectId, projectId)).limit(1);

  try {
    // Use upsert-like logic with the new unique constraint
    console.log(`[DB] Updating project content for ID ${projectId}. Keys: ${Object.keys(data).join(', ')}`);
    
    // Check project existence
    const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (project.length === 0) {
      throw new Error(`Project ${projectId} not found. Cannot update content.`);
    }

    // Try update first
    await db.update(projectContent)
      .set(data)
      .where(eq(projectContent.projectId, projectId));
    
    // If no row was affected, it might be a new project without content row yet
    if (existing.length === 0) {
       console.log(`[DB] No row existed, inserting for ID ${projectId}`);
       await db.insert(projectContent).values({ projectId, ...data });
    }
  } catch (err: any) {
    console.error(`[DB] Failed to update/insert projectContent for ${projectId}:`, err.message);
    throw err;
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