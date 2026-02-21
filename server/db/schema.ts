import { mysqlTable, serial, varchar, int, decimal, timestamp, json, text, boolean } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// --- PROJECTS (The Bible) ---
export const projects = mysqlTable('projects', {
    id: serial('id').primaryKey(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    // The "Project Bible" - standardized JSON structure
    bible: json('bible'),
    // Quality Control
    isScriptLocked: boolean('is_script_locked').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const projectsRelations = relations(projects, ({ many }) => ({
    scenes: many(scenes),
    usage: many(usageLedger),
}));

// --- SCENES (Narrative Breakdown) ---
export const scenes = mysqlTable('scenes', {
    id: serial('id').primaryKey(),
    projectId: int('project_id').notNull(),
    order: int('order').notNull(),
    title: varchar('title', { length: 255 }),
    description: text('description'),
    status: varchar('status', { length: 50 }).default('draft'), // draft, script_locked, filmed
    createdAt: timestamp('created_at').defaultNow(),
});

export const scenesRelations = relations(scenes, ({ one, many }) => ({
    project: one(projects, {
        fields: [scenes.projectId],
        references: [projects.id],
    }),
    shots: many(shots),
}));

// --- SHOTS (Director's Shot List) ---
export const shots = mysqlTable('shots', {
    id: serial('id').primaryKey(),
    sceneId: int('scene_id').notNull(),
    order: int('order').notNull(),
    // Director's vision
    visualDescription: text('visual_description'),
    audioDescription: text('audio_description'),
    cameraAngle: varchar('camera_angle', { length: 100 }),
    movement: varchar('movement', { length: 100 }),
    status: varchar('status', { length: 50 }).default('planned'), // planned, generated, approved
});

export const shotsRelations = relations(shots, ({ one, many }) => ({
    scene: one(scenes, {
        fields: [shots.sceneId],
        references: [scenes.id],
    }),
    generations: many(generations),
}));

// --- GENERATIONS (AI Outputs & Assets) ---
export const generations = mysqlTable('generations', {
    id: serial('id').primaryKey(),
    shotId: int('shot_id'), // Can be null if it's a concept art not linked to a shot
    projectId: int('project_id').notNull(), // Always link to project for billing

    // The Asset
    imageUrl: text('image_url').notNull(), // GCS Link
    prompt: text('prompt').notNull(),
    model: varchar('model', { length: 100 }).notNull(),

    // Cost tracking for this specific asset
    cost: decimal('cost', { precision: 10, scale: 4 }).notNull(),

    createdAt: timestamp('created_at').defaultNow(),
});

export const generationsRelations = relations(generations, ({ one }) => ({
    shot: one(shots, {
        fields: [generations.shotId],
        references: [shots.id],
    }),
    project: one(projects, {
        fields: [generations.projectId],
        references: [projects.id],
    }),
}));

// --- USAGE LEDGER (FinOps) ---
export const usageLedger = mysqlTable('usage_ledger', {
    id: serial('id').primaryKey(),
    projectId: int('project_id').notNull(),
    userId: varchar('user_id', { length: 255 }).notNull(),

    // What did we do?
    actionType: varchar('action_type', { length: 50 }).notNull(), // 'IMAGE_GEN', 'VIDEO_GEN'
    modelId: varchar('model_id', { length: 100 }).notNull(),      // 'black-forest-labs/flux-pro'

    // How much was it?
    quantity: int('quantity').default(1),                         // Seconds or Count
    cost: decimal('cost', { precision: 10, scale: 4 }).notNull(), // stored as 0.0550

    createdAt: timestamp('created_at').defaultNow(),
});

export const usageLedgerRelations = relations(usageLedger, ({ one }) => ({
    project: one(projects, {
        fields: [usageLedger.projectId],
        references: [projects.id],
    }),
}));