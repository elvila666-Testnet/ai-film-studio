import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, decimal, mediumtext, longtext } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const brands = mysqlTable("brands", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Brand = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  brandId: varchar("brandId", { length: 36 }).references(() => brands.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["spot", "movie"]).default("movie").notNull(),
  targetDuration: int("targetDuration"), // in seconds
  aspectRatio: varchar("aspectRatio", { length: 50 }).default("16:9"),
  thumbnailUrl: text("thumbnailUrl"),
  isScriptLocked: boolean("isScriptLocked").default(false).notNull(), // Locks the script from further edits
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  bible: json("bible"), // The "Project Bible"
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export const projectContent = mysqlTable("projectContent", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique().references(() => projects.id, { onDelete: "cascade" }),
  brief: text("brief"),
  synopsis: mediumtext("synopsis"),
  script: mediumtext("script"),
  masterVisual: mediumtext("masterVisual"),
  technicalShots: mediumtext("technicalShots"), // JSON stored as text
  storyboardPrompts: mediumtext("storyboardPrompts"), // JSON stored as text
  scriptComplianceScore: int("scriptComplianceScore"),
  visualComplianceScore: int("visualComplianceScore"),
  storyboardComplianceScore: int("storyboardComplianceScore"),
  voiceoverComplianceScore: int("voiceoverComplianceScore"),
  complianceMetadata: text("complianceMetadata"), // JSON with detailed compliance info
  globalDirectorNotes: mediumtext("globalDirectorNotes"), // Global notes influencing all AI generations
  visualStyle: longtext("visualStyle"), // e.g. "Cinematic", "Noir" etc
  brandVoice: mediumtext("brandVoice"),
  visualIdentity: mediumtext("visualIdentity"),
  colorPalette: json("colorPalette"),
  // Pipeline approval gates
  scriptStatus: mysqlEnum("scriptStatus", ["draft", "pending_review", "approved"]).default("draft"),
  technicalScriptStatus: mysqlEnum("technicalScriptStatus", ["draft", "pending_review", "approved"]).default("draft"),
  proposalStatus: mysqlEnum("proposalStatus", ["draft", "pending_review", "approved"]).default("draft"),

  // New Narrative Workflow Content
  creativeProposal: mediumtext("creativeProposal"),
  brandValidationFeedback: text("brandValidationFeedback"),
  technicalScript: mediumtext("technicalScript"),

  // Department validation persistence
  castingValidated: boolean("castingValidated").default(false),
  castingApprovedOutput: mediumtext("castingApprovedOutput"), // JSON: Validated character list with imageUrls

  cineValidated: boolean("cineValidated").default(false),
  cineApprovedOutput: mediumtext("cineApprovedOutput"), // JSON: { specs, referenceUrls[], moodboardUrls[] }

  pdValidated: boolean("pdValidated").default(false),
  pdApprovedOutput: mediumtext("pdApprovedOutput"), // JSON: { specs, referenceUrls[], moodboardUrls[] }
  proposalDirectorNotes: mediumtext("proposalDirectorNotes"), // Notes for the creative proposal revision

  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectContent = typeof projectContent.$inferSelect;
export type InsertProjectContent = typeof projectContent.$inferInsert;

export const characters = mysqlTable("characters", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = typeof characters.$inferInsert;

export const characterLibrary = mysqlTable("characterLibrary", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CharacterLibrary = typeof characterLibrary.$inferSelect;
export type InsertCharacterLibrary = typeof characterLibrary.$inferInsert;

export const storyboardImages = mysqlTable("storyboardImages", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  shotNumber: int("shotNumber").notNull(),
  imageUrl: longtext("imageUrl").notNull(),
  prompt: longtext("prompt"),
  videoUrl: text("videoUrl"), // Generated video from this frame
  characterId: int("characterId").references(() => characters.id, { onDelete: "set null" }), // Which character appears
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  characterReference: text("characterReference"),
  seed: int("seed"),
  generationVariant: int("generationVariant").default(0),
  qualityTier: mysqlEnum("qualityTier", ["fast", "quality"]).default("fast").notNull(), // FinOps Control
  // 3x3 Grid Redesign Data
  status: mysqlEnum("status", ["draft", "approved"]).default("draft").notNull(),
  masterImageUrl: longtext("masterImageUrl"), // The 4k Upscaled Version
  // Character consistency tracking
  characterLibraryId: int("characterLibraryId").references(() => characterLibrary.id, { onDelete: "set null" }),
  characterAppearance: json("characterAppearance"), // JSON: clothing, expression, pose
  consistencyScore: int("consistencyScore"), // 0-100: consistency with other appearances
  consistencyNotes: text("consistencyNotes"), // AI feedback on consistency issues
  isConsistencyLocked: boolean("isConsistencyLocked").default(false), // Prevent changes after approval
});

export type StoryboardImage = typeof storyboardImages.$inferSelect;
export type InsertStoryboardImage = typeof storyboardImages.$inferInsert;

export const animaticConfigs = mysqlTable("animaticConfigs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  frameDurations: text("frameDurations"), // JSON: { shotNumber: duration }
  audioUrl: text("audioUrl"),
  audioVolume: int("audioVolume").default(100), // 0-100
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AnimaticConfig = typeof animaticConfigs.$inferSelect;
export type InsertAnimaticConfig = typeof animaticConfigs.$inferInsert;

export const referenceImages = mysqlTable("referenceImages", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  imageUrl: longtext("imageUrl").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReferenceImage = typeof referenceImages.$inferSelect;
export type InsertReferenceImage = typeof referenceImages.$inferInsert;

export const generatedVideos = mysqlTable("generatedVideos", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  videoUrl: text("videoUrl"),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  taskId: varchar("taskId", { length: 255 }),
  modelId: varchar("modelId", { length: 255 }),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GeneratedVideo = typeof generatedVideos.$inferSelect;
export type InsertGeneratedVideo = typeof generatedVideos.$inferInsert;

// Video Editor Tables
export const editorProjects = mysqlTable("editorProjects", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  duration: int("duration").default(0), // in seconds
  fps: int("fps").default(24),
  resolution: varchar("resolution", { length: 50 }).default("1920x1080"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EditorProject = typeof editorProjects.$inferSelect;
export type InsertEditorProject = typeof editorProjects.$inferInsert;

export const editorClips = mysqlTable("editorClips", {
  id: int("id").autoincrement().primaryKey(),
  editorProjectId: int("editorProjectId").notNull().references(() => editorProjects.id, { onDelete: "cascade" }),
  trackId: int("trackId").notNull(), // Which track (video/audio)
  fileUrl: text("fileUrl").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(), // video, audio, image
  duration: int("duration").notNull(), // in milliseconds
  startTime: int("startTime").default(0), // in milliseconds
  endTime: int("endTime"), // in milliseconds
  trimStart: int("trimStart").default(0), // trim offset in ms
  trimEnd: int("trimEnd"), // trim offset in ms
  effects: json("effects"), // JSON array of applied effects
  colorCorrection: json("colorCorrection"), // JSON object for color correction properties
  textProperties: json("textProperties"), // JSON object for text overlay properties (if fileType is 'text')
  volume: int("volume").default(100), // 0-100
  order: int("order").notNull(), // position in track
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EditorClip = typeof editorClips.$inferSelect;
export type InsertEditorClip = typeof editorClips.$inferInsert;

export const editorKeyframes = mysqlTable("editorKeyframes", {
  id: int("id").autoincrement().primaryKey(),
  editorClipId: int("editorClipId").notNull().references(() => editorClips.id, { onDelete: "cascade" }),
  property: varchar("property", { length: 255 }).notNull(), // e.g., 'volume', 'opacity', 'x_position', 'brightness'
  time: int("time").notNull(), // in milliseconds
  value: json("value"), // The value of the property at that time
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EditorKeyframe = typeof editorKeyframes.$inferSelect;
export type InsertEditorKeyframe = typeof editorKeyframes.$inferInsert;

export const editorTracks = mysqlTable("editorTracks", {
  id: int("id").autoincrement().primaryKey(),
  editorProjectId: int("editorProjectId").notNull().references(() => editorProjects.id, { onDelete: "cascade" }),
  trackType: varchar("trackType", { length: 50 }).notNull(), // video, audio, text
  trackNumber: int("trackNumber").notNull(),
  name: varchar("name", { length: 255 }),
  muted: boolean("muted").default(false).notNull(),
  volume: int("volume").default(100),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EditorTrack = typeof editorTracks.$inferSelect;
export type InsertEditorTrack = typeof editorTracks.$inferInsert;

export const editorTransitions = mysqlTable("editorTransitions", {
  id: int("id").autoincrement().primaryKey(),
  editorProjectId: int("editorProjectId").notNull().references(() => editorProjects.id, { onDelete: "cascade" }),
  fromClipId: int("fromClipId").notNull().references(() => editorClips.id, { onDelete: "cascade" }),
  toClipId: int("toClipId").notNull().references(() => editorClips.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // e.g., 'crossfade', 'wipe'
  duration: int("duration").notNull(), // in milliseconds
  parameters: json("parameters"), // JSON object for transition-specific settings
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EditorTransition = typeof editorTransitions.$inferSelect;
export type InsertEditorTransition = typeof editorTransitions.$inferInsert;
