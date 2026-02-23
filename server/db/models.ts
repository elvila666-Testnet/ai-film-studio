import { modelConfigs, InsertModelConfig } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

import { getDb } from "../db";
import { repairSchema } from "./repair";

export * from "../../drizzle/schema";

export async function getModelConfigs() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(modelConfigs);
}

export async function getActiveModelConfig(category: "text" | "image" | "video") {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(modelConfigs)
    .where(and(eq(modelConfigs.category, category), eq(modelConfigs.isActive, true)))
    .limit(1);
  return result[0];
}

export async function upsertModelConfig(config: InsertModelConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // If this model is being set to active, deactivate others in the same category
  if (config.isActive) {
    await db
      .update(modelConfigs)
      .set({ isActive: false })
      .where(eq(modelConfigs.category, config.category));
  }

  // Use a unique constraint on category + provider + modelId if we had one, 
  // but for now let's just use the id if provided or find by provider+modelId
  if (config.id) {
    await db.update(modelConfigs).set(config).where(eq(modelConfigs.id, config.id));
  } else {
    // Check if it exists
    const existing = await db
      .select()
      .from(modelConfigs)
      .where(
        and(
          eq(modelConfigs.category, config.category),
          eq(modelConfigs.provider, config.provider),
          eq(modelConfigs.modelId, config.modelId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(modelConfigs)
        .set(config)
        .where(eq(modelConfigs.id, existing[0].id));
    } else {
      await db.insert(modelConfigs).values(config);
    }
  }
}

export async function deleteModelConfig(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(modelConfigs).where(eq(modelConfigs.id, id));
}

export async function setActiveModel(id: number) {
  const db = await getDb();
  if (!db) return;

  const config = await db.select().from(modelConfigs).where(eq(modelConfigs.id, id)).limit(1);
  if (config.length === 0) return;

  // Deactivate all in category
  await db
    .update(modelConfigs)
    .set({ isActive: false })
    .where(eq(modelConfigs.category, config[0].category));

  // Activate this one
  await db
    .update(modelConfigs)
    .set({ isActive: true })
    .where(eq(modelConfigs.id, id));
}

export async function initializeModels() {
  const db = await getDb();
  if (!db) return;

  console.log("[Database] Checking modelConfigs table...");
  try {
    // Crude way to ensure table exists in case migrations haven't run
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`modelConfigs\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`category\` enum('text','image','video') NOT NULL,
        \`provider\` varchar(255) NOT NULL,
        \`modelId\` varchar(255) NOT NULL,
        \`name\` varchar(255),
        \`description\` text,
        \`costPerUnit\` decimal(10, 4) DEFAULT '0.0000',
        \`apiKey\` text,
        \`apiEndpoint\` text,
        \`isActive\` boolean NOT NULL DEFAULT false,
        \`isBuiltIn\` boolean NOT NULL DEFAULT false,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("[Database] modelConfigs table verified/created.");
  } catch (err: any) {
    console.warn("[Database] Failed to verify/create modelConfigs table:", err.message);
  }

  // Run schema repairs AFTER ensuring the base tables are likely present
  await repairSchema();

  try {
    await db.select().from(modelConfigs);
  } catch (err) {
    console.warn("[Database] Could not select from modelConfigs. Table might be missing or schema mismatch.");
    return; // Exit early if we can't even select
  }

  console.log("[Database] Initializing/Verifying default models...");

  const defaults: InsertModelConfig[] = [
    // Text Models
    { category: "text", provider: "Google", modelId: "gemini-2.0-flash", isActive: true, isBuiltIn: true },
    { category: "text", provider: "OpenAI", modelId: "gpt-4o", isActive: false, isBuiltIn: true },

    // Image Models
    { category: "image", provider: "Apiyi", modelId: "mj-v6", isActive: true, isBuiltIn: true },
    { category: "image", provider: "Replicate", modelId: "Flux", isActive: false, isBuiltIn: true },
    { category: "image", provider: "Replicate", modelId: "Nano Banana", isActive: false, isBuiltIn: true },
    { category: "image", provider: "Replicate", modelId: "Nano Banana Pro", isActive: false, isBuiltIn: true },
    { category: "image", provider: "Replicate", modelId: "Seadream 4.5", isActive: false, isBuiltIn: true },
    { category: "image", provider: "OpenAI", modelId: "dall-e-3", isActive: false, isBuiltIn: true },

    // Video Models
    { category: "video", provider: "Google", modelId: "Veo3", isActive: true, isBuiltIn: true },
    { category: "video", provider: "OpenAI", modelId: "Sora", isActive: false, isBuiltIn: true },
    { category: "video", provider: "Runway", modelId: "Gen-3 Alpha", isActive: false, isBuiltIn: true },
    { category: "video", provider: "Kling", modelId: "Kling AI", isActive: false, isBuiltIn: true },
    { category: "video", provider: "Luma", modelId: "Dream Machine", isActive: false, isBuiltIn: true },
    { category: "video", provider: "Wan", modelId: "Wan 2.1", isActive: false, isBuiltIn: true },
  ];

  for (const model of defaults) {
    const existingModel = await db
      .select()
      .from(modelConfigs)
      .where(
        and(
          eq(modelConfigs.provider, model.provider),
          eq(modelConfigs.modelId, model.modelId)
        )
      )
      .limit(1);

    if (existingModel.length === 0) {
      console.log(`[Database] Seeding new model: ${model.provider} / ${model.modelId}`);
      await db.insert(modelConfigs).values(model);
    }
  }
}

export async function ensureActiveModels() {
  const db = await getDb();
  if (!db) return;

  const categories: ("text" | "image" | "video")[] = ["text", "image", "video"];
  for (const cat of categories) {
    const active = await db
      .select()
      .from(modelConfigs)
      .where(and(eq(modelConfigs.category, cat), eq(modelConfigs.isActive, true)))
      .limit(1);

    if (active.length === 0) {
      const first = await db
        .select()
        .from(modelConfigs)
        .where(eq(modelConfigs.category, cat))
        .limit(1);

      if (first.length > 0) {
        console.log(`[Database] Activating first available model for category: ${cat}`);
        await db
          .update(modelConfigs)
          .set({ isActive: true })
          .where(eq(modelConfigs.id, first[0].id));
      }
    }
  }
}