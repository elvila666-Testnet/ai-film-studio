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
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logoUrl"),
  description: text("description"),
  targetAudience: text("targetAudience"),
  aesthetic: text("aesthetic"),
  mission: text("mission"),
  coreMessaging: text("coreMessaging"),
  brandVoice: text("brandVoice"),
  negativeConstraints: text("negativeConstraints"),
  colorPalette: json("colorPalette"),
  productReferenceImages: text("productReferenceImages"),
  visualIdentity: text("visualIdentity"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Brand = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

export const brandAssets = mysqlTable("brandAssets", {
  id: int("id").autoincrement().primaryKey(),
  brandId: varchar("brandId", { length: 36 }).notNull().references(() => brands.id, { onDelete: "cascade" }),
  assetType: mysqlEnum("assetType", ["PDF", "URL", "IMG"]).notNull(),
  gcsPath: text("gcsPath").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BrandAsset = typeof brandAssets.$inferSelect;
export type InsertBrandAsset = typeof brandAssets.$inferInsert;

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
  referenceImageUrl: text("referenceImageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = typeof characters.$inferInsert;

export const characterLibrary = mysqlTable("characterLibrary", {
  id: int("id").autoincrement().primaryKey(),
  brandId: varchar("brandId", { length: 36 }).notNull().references(() => brands.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl").notNull(),
  traits: text("traits"),
  usageCount: int("usageCount").default(0),
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

// --- ANTIGRAVITY AGENT TABLES ---

export const scenes = mysqlTable("scenes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  order: int("order").notNull(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  // Production Design Fields
  locationDetails: text("locationDetails"), // Description of the location
  setDesign: text("setDesign"), // Details on props, set dressing
  status: varchar("status", { length: 50 }).default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Scene = typeof scenes.$inferSelect;
export type InsertScene = typeof scenes.$inferInsert;

export const shots = mysqlTable("shots", {
  id: int("id").autoincrement().primaryKey(),
  sceneId: int("sceneId").notNull().references(() => scenes.id, { onDelete: "cascade" }),
  order: int("order").notNull(),
  visualDescription: longtext("visualDescription"),
  audioDescription: longtext("audioDescription"),
  cameraAngle: varchar("cameraAngle", { length: 255 }),
  movement: longtext("movement"),
  // Cinematography Fields
  lighting: longtext("lighting"), // e.g., "Golden Hour", "High Key"
  lens: longtext("lens"), // e.g., "35mm", "Anamorphic"
  filmStock: varchar("filmStock", { length: 255 }), // e.g., "Kodak Vision3"
  // Multi-Agent Pipeline Output
  aiBlueprint: longtext("aiBlueprint"), // Storing JSON as longtext to avoid length limits
  status: varchar("status", { length: 50 }).default("planned"),
  directorNotes: text("directorNotes"), // Human director notes for shot revision
  isApproved: boolean("isApproved").default(false).notNull(), // Approval status
  referenceImageUrl: longtext("referenceImageUrl"), // User-uploaded or AI-rendered reference
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Shot = typeof shots.$inferSelect;
export type InsertShot = typeof shots.$inferInsert;

export const generations = mysqlTable("generations", {
  id: int("id").autoincrement().primaryKey(),
  shotId: int("shotId").references(() => shots.id, { onDelete: "set null" }),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  imageUrl: longtext("imageUrl").notNull(),
  prompt: text("prompt").notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  qualityTier: mysqlEnum("qualityTier", ["fast", "quality"]).default("fast").notNull(), // FinOps Control
  cost: decimal("cost", { precision: 10, scale: 4 }).notNull(),
  status: mysqlEnum("status", ["draft", "approved"]).default("draft").notNull(),
  masterImageUrl: longtext("masterImageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Generation = typeof generations.$inferSelect;
export type InsertGeneration = typeof generations.$inferInsert;

export const usageLedger = mysqlTable("usage_ledger", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("userId", { length: 255 }).notNull(), // Using varchar to support potential external IDs, though project links to internal user
  actionType: varchar("actionType", { length: 50 }).notNull(),
  modelId: varchar("modelId", { length: 100 }).notNull(),
  quantity: int("quantity").default(1),
  cost: decimal("cost", { precision: 10, scale: 4 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UsageLedger = typeof usageLedger.$inferSelect;
export type InsertUsageLedger = typeof usageLedger.$inferInsert;

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
  type: varchar("transitionType", { length: 50 }).notNull(),
  duration: int("duration").notNull(), // in milliseconds
  parameters: json("parameters"), // JSON object for transition-specific settings
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EditorTransition = typeof editorTransitions.$inferSelect;
export type InsertEditorTransition = typeof editorTransitions.$inferInsert;

export const editorComments = mysqlTable("editorComments", {
  id: int("id").autoincrement().primaryKey(),
  clipId: int("clipId").notNull().references(() => editorClips.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  timestamp: int("timestamp").default(0),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EditorComment = typeof editorComments.$inferSelect;
export type InsertEditorComment = typeof editorComments.$inferInsert;

export const editorExports = mysqlTable("editorExports", {
  id: int("id").autoincrement().primaryKey(),
  editorProjectId: int("editorProjectId").notNull().references(() => editorProjects.id, { onDelete: "cascade" }),
  exportUrl: text("exportUrl"),
  format: varchar("format", { length: 50 }).notNull(),
  quality: varchar("quality", { length: 50 }).default("1080p"),
  status: varchar("status", { length: 50 }).default("pending"),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EditorExport = typeof editorExports.$inferSelect;
export type InsertEditorExport = typeof editorExports.$inferInsert;

export const storyboardFrameOrder = mysqlTable("storyboardFrameOrder", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  shotNumber: int("shotNumber").notNull(),
  displayOrder: int("displayOrder").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StoryboardFrameOrder = typeof storyboardFrameOrder.$inferSelect;
export type InsertStoryboardFrameOrder = typeof storyboardFrameOrder.$inferInsert;

export const storyboardFrameHistory = mysqlTable("storyboardFrameHistory", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  shotNumber: int("shotNumber").notNull(),
  imageUrl: longtext("imageUrl").notNull(),
  prompt: text("prompt"),
  notes: text("notes"),
  versionNumber: int("versionNumber").notNull(),
  isActive: boolean("isActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StoryboardFrameHistory = typeof storyboardFrameHistory.$inferSelect;
export type InsertStoryboardFrameHistory = typeof storyboardFrameHistory.$inferInsert;

export const storyboardFrameNotes = mysqlTable("storyboardFrameNotes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  shotNumber: int("shotNumber").notNull(),
  notes: text("notes"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StoryboardFrameNote = typeof storyboardFrameNotes.$inferSelect;
export type InsertStoryboardFrameNote = typeof storyboardFrameNotes.$inferInsert;

export const actors = mysqlTable("actors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  triggerWord: varchar("triggerWord", { length: 255 }).notNull(),
  loraId: varchar("loraId", { length: 255 }),
  status: varchar("status", { length: 50 }).default("pending"),
  trainingId: varchar("trainingId", { length: 255 }),
  zipUrl: text("zipUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Actor = typeof actors.$inferSelect;
export type InsertActor = typeof actors.$inferInsert;

export const audioAssets = mysqlTable("audioAssets", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sceneId: int("sceneId").references(() => scenes.id, { onDelete: "set null" }),
  type: varchar("type", { length: 50 }).notNull(),
  url: text("url").notNull(),
  duration: int("duration"),
  label: varchar("label", { length: 255 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AudioAsset = typeof audioAssets.$inferSelect;
export type InsertAudioAsset = typeof audioAssets.$inferInsert;

export const moodboards = mysqlTable("moodboards", {
  id: int("id").autoincrement().primaryKey(),
  brandId: varchar("brandId", { length: 36 }).notNull().references(() => brands.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Moodboard = typeof moodboards.$inferSelect;
export type InsertMoodboard = typeof moodboards.$inferInsert;

export const moodboardImages = mysqlTable("moodboardImages", {
  id: int("id").autoincrement().primaryKey(),
  moodboardId: int("moodboardId").notNull().references(() => moodboards.id, { onDelete: "cascade" }),
  imageUrl: text("imageUrl").notNull(),
  description: text("description"),
  colorPalette: text("colorPalette"),
  composition: text("composition"),
  style: text("style"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MoodboardImage = typeof moodboardImages.$inferSelect;
export type InsertMoodboardImage = typeof moodboardImages.$inferInsert;

export const brandVoiceProfiles = mysqlTable("brandVoiceProfiles", {
  id: int("id").autoincrement().primaryKey(),
  brandId: varchar("brandId", { length: 36 }).notNull().references(() => brands.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  elevenLabsVoiceId: varchar("elevenLabsVoiceId", { length: 255 }),
  description: text("description"),
  language: varchar("language", { length: 10 }).default("en"),
  tone: varchar("tone", { length: 100 }),
  speed: int("speed").default(100),
  pitch: int("pitch").default(100),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrandVoiceProfile = typeof brandVoiceProfiles.$inferSelect;
export type InsertBrandVoiceProfile = typeof brandVoiceProfiles.$inferInsert;

export const generatedVoiceovers = mysqlTable("generatedVoiceovers", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  voiceProfileId: int("voiceProfileId").notNull().references(() => brandVoiceProfiles.id, { onDelete: "cascade" }),
  script: text("script").notNull(),
  audioUrl: text("audioUrl").notNull(),
  duration: int("duration"),
  language: varchar("language", { length: 10 }).default("en"),
  elevenLabsJobId: varchar("elevenLabsJobId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeneratedVoiceover = typeof generatedVoiceovers.$inferSelect;
export type InsertGeneratedVoiceover = typeof generatedVoiceovers.$inferInsert;

export const musicLibrary = mysqlTable("musicLibrary", {
  id: int("id").autoincrement().primaryKey(),
  brandId: varchar("brandId", { length: 36 }).notNull().references(() => brands.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }),
  description: text("description"),
  audioUrl: text("audioUrl").notNull(),
  duration: int("duration"),
  genre: varchar("genre", { length: 100 }),
  mood: varchar("mood", { length: 100 }),
  tempo: int("tempo"),
  isActive: boolean("isActive").default(true),
  source: varchar("source", { length: 50 }),
  sourceId: varchar("sourceId", { length: 255 }),
  usageCount: int("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MusicLibrary = typeof musicLibrary.$inferSelect;
export type InsertMusicLibrary = typeof musicLibrary.$inferInsert;

export const brandMusicPreferences = mysqlTable("brandMusicPreferences", {
  id: int("id").autoincrement().primaryKey(),
  brandId: varchar("brandId", { length: 36 }).notNull().references(() => brands.id, { onDelete: "cascade" }),
  preferredGenres: text("preferredGenres"),
  preferredMoods: text("preferredMoods"),
  tempoRange: varchar("tempoRange", { length: 50 }),
  excludedGenres: text("excludedGenres"),
  excludedArtists: text("excludedArtists"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrandMusicPreferences = typeof brandMusicPreferences.$inferSelect;
export type InsertBrandMusicPreferences = typeof brandMusicPreferences.$inferInsert;

export const projectMusicSelections = mysqlTable("projectMusicSelections", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  musicId: int("musicId").notNull().references(() => musicLibrary.id, { onDelete: "cascade" }),
  startTime: int("startTime"),
  duration: int("duration"),
  volume: int("volume").default(100),
  fadeIn: int("fadeIn").default(0),
  fadeOut: int("fadeOut").default(0),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectMusicSelection = typeof projectMusicSelections.$inferSelect;
export type InsertProjectMusicSelection = typeof projectMusicSelections.$inferInsert;

export const musicSuggestions = mysqlTable("musicSuggestions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  musicId: int("musicId").notNull().references(() => musicLibrary.id, { onDelete: "cascade" }),
  matchScore: int("matchScore"),
  reasoning: text("reasoning"),
  moodAlignment: int("moodAlignment"),
  brandAlignment: int("brandAlignment"),
  paceAlignment: int("paceAlignment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MusicSuggestion = typeof musicSuggestions.$inferSelect;
export type InsertMusicSuggestion = typeof musicSuggestions.$inferInsert;

export const modelConfigs = mysqlTable("modelConfigs", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", ["text", "image", "video"]).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  modelId: varchar("modelId", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  description: text("description"),
  costPerUnit: decimal("costPerUnit", { precision: 10, scale: 4 }).default("0.0000"),
  apiKey: text("apiKey"),
  apiEndpoint: text("apiEndpoint"),
  isActive: boolean("isActive").default(false).notNull(),
  isBuiltIn: boolean("isBuiltIn").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ModelConfig = typeof modelConfigs.$inferSelect;
export type InsertModelConfig = typeof modelConfigs.$inferInsert;

export const userModelFavorites = mysqlTable("userModelFavorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  modelConfigId: int("modelConfigId").notNull().references(() => modelConfigs.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserModelFavorite = typeof userModelFavorites.$inferSelect;
export type InsertUserModelFavorite = typeof userModelFavorites.$inferInsert;

export const productionDesignSets = mysqlTable("productionDesignSets", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: mediumtext("description"),
  atmospherePhilosophy: mediumtext("atmospherePhilosophy"),
  imageGenerationPrompt: mediumtext("imageGenerationPrompt"),
  imageUrl: longtext("imageUrl"),
  referenceImageUrl: longtext("referenceImageUrl"),
  status: varchar("status", { length: 50 }).default("draft"),
  directorNotes: text("directorNotes"),
  isApproved: boolean("isApproved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductionDesignSet = typeof productionDesignSets.$inferSelect;
export type InsertProductionDesignSet = typeof productionDesignSets.$inferInsert;

export const productionDesignProps = mysqlTable("productionDesignProps", {
  id: int("id").autoincrement().primaryKey(),
  setId: int("setId").references(() => productionDesignSets.id, { onDelete: "cascade" }),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  symbolism: text("symbolism"),
  imageGenerationPrompt: text("imageGenerationPrompt"),
  imageUrl: longtext("imageUrl"),
  referenceImageUrl: longtext("referenceImageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductionDesignProp = typeof productionDesignProps.$inferSelect;
export type InsertProductionDesignProp = typeof productionDesignProps.$inferInsert;

export const shotActors = mysqlTable("shotActors", {
  id: int("id").autoincrement().primaryKey(),
  shotId: int("shotId").notNull().references(() => shots.id, { onDelete: "cascade" }),
  actorId: int("actorId").notNull().references(() => actors.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShotActor = typeof shotActors.$inferSelect;
export type InsertShotActor = typeof shotActors.$inferInsert;

// ───────────────────────────────────────────────────────────
// SUBSCRIPTION & BILLING TABLES
// ───────────────────────────────────────────────────────────

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  tier: mysqlEnum("tier", ["starter", "pro", "enterprise"]).notNull(),
  status: mysqlEnum("status", ["active", "cancelled", "past_due", "trialing", "incomplete"]).default("incomplete").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }).notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripePriceId: varchar("stripePriceId", { length: 255 }),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const tokenBalances = mysqlTable("tokenBalances", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  balance: int("balance").default(0).notNull(),
  totalPurchased: int("totalPurchased").default(0).notNull(),
  totalConsumed: int("totalConsumed").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TokenBalance = typeof tokenBalances.$inferSelect;
export type InsertTokenBalance = typeof tokenBalances.$inferInsert;

export const tokenTransactions = mysqlTable("tokenTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["subscription_credit", "purchase", "consumption", "refund", "bonus"]).notNull(),
  amount: int("amount").notNull(), // positive = credit, negative = debit
  balance: int("balance").notNull(), // balance AFTER this transaction
  description: varchar("description", { length: 500 }).notNull(),
  relatedProjectId: int("relatedProjectId").references(() => projects.id, { onDelete: "set null" }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TokenTransaction = typeof tokenTransactions.$inferSelect;
export type InsertTokenTransaction = typeof tokenTransactions.$inferInsert;
