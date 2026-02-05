import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

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

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  brandId: int("brandId").references(() => brands.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export const projectContent = mysqlTable("projectContent", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  brief: text("brief"),
  script: text("script"),
  masterVisual: text("masterVisual"),
  technicalShots: text("technicalShots"), // JSON stored as text
  storyboardPrompts: text("storyboardPrompts"), // JSON stored as text
  scriptComplianceScore: int("scriptComplianceScore"),
  visualComplianceScore: int("visualComplianceScore"),
  storyboardComplianceScore: int("storyboardComplianceScore"),
  voiceoverComplianceScore: int("voiceoverComplianceScore"),
  complianceMetadata: text("complianceMetadata"), // JSON with detailed compliance info
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectContent = typeof projectContent.$inferSelect;
export type InsertProjectContent = typeof projectContent.$inferInsert;

export const storyboardImages = mysqlTable("storyboardImages", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  shotNumber: int("shotNumber").notNull(),
  imageUrl: text("imageUrl").notNull(),
  prompt: text("prompt"),
  videoUrl: text("videoUrl"), // Generated video from this frame
  characterId: int("characterId").references(() => characters.id, { onDelete: "set null" }), // Which character appears
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  characterReference: text("characterReference"),
  seed: int("seed"),
  generationVariant: int("generationVariant").default(0),
  // Character consistency tracking
  characterLibraryId: int("characterLibraryId").references(() => characterLibrary.id, { onDelete: "set null" }),
  characterAppearance: text("characterAppearance"), // JSON: clothing, expression, pose
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
  imageUrl: text("imageUrl").notNull(),
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
  volume: int("volume").default(100), // 0-100
  order: int("order").notNull(), // position in track
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EditorClip = typeof editorClips.$inferSelect;
export type InsertEditorClip = typeof editorClips.$inferInsert;

export const editorTracks = mysqlTable("editorTracks", {
  id: int("id").autoincrement().primaryKey(),
  editorProjectId: int("editorProjectId").notNull().references(() => editorProjects.id, { onDelete: "cascade" }),
  trackType: varchar("trackType", { length: 50 }).notNull(), // video, audio
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
  transitionType: varchar("transitionType", { length: 50 }).notNull(), // fade, dissolve, wipe, etc
  duration: int("duration").default(500), // in milliseconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EditorTransition = typeof editorTransitions.$inferSelect;
export type InsertEditorTransition = typeof editorTransitions.$inferInsert;

export const editorExports = mysqlTable("editorExports", {
  id: int("id").autoincrement().primaryKey(),
  editorProjectId: int("editorProjectId").notNull().references(() => editorProjects.id, { onDelete: "cascade" }),
  exportUrl: text("exportUrl"),
  format: varchar("format", { length: 50 }).notNull(), // mp4, webm, mov, etc
  quality: varchar("quality", { length: 50 }).default("1080p"), // 720p, 1080p, 4k
  status: varchar("status", { length: 50 }).default("pending"), // pending, processing, completed, failed
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EditorExport = typeof editorExports.$inferSelect;
export type InsertEditorExport = typeof editorExports.$inferInsert;

export const editorComments = mysqlTable("editorComments", {
  id: int("id").autoincrement().primaryKey(),
  clipId: int("clipId").notNull().references(() => editorClips.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  timestamp: int("timestamp").default(0), // time in ms where comment was added
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EditorComment = typeof editorComments.$inferSelect;
export type InsertEditorComment = typeof editorComments.$inferInsert;

// Storyboard Enhancement Tables
export const storyboardFrameOrder = mysqlTable("storyboardFrameOrder", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  shotNumber: int("shotNumber").notNull(),
  displayOrder: int("displayOrder").notNull(), // Position in UI (0-indexed)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StoryboardFrameOrder = typeof storyboardFrameOrder.$inferSelect;
export type InsertStoryboardFrameOrder = typeof storyboardFrameOrder.$inferInsert;

export const storyboardFrameHistory = mysqlTable("storyboardFrameHistory", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  shotNumber: int("shotNumber").notNull(),
  imageUrl: text("imageUrl").notNull(),
  prompt: text("prompt"),
  notes: text("notes"),
  versionNumber: int("versionNumber").notNull(), // 1, 2, 3, etc
  isActive: boolean("isActive").default(false).notNull(), // Current active version
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StoryboardFrameHistory = typeof storyboardFrameHistory.$inferSelect;
export type InsertStoryboardFrameHistory = typeof storyboardFrameHistory.$inferInsert;

export const storyboardFrameNotes = mysqlTable("storyboardFrameNotes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  shotNumber: int("shotNumber").notNull(),
  notes: text("notes"),
  metadata: text("metadata"), // JSON: { duration, effects, audio, etc }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StoryboardFrameNotes = typeof storyboardFrameNotes.$inferSelect;
export type InsertStoryboardFrameNotes = typeof storyboardFrameNotes.$inferInsert;

// Brand Brain Tables
export const brands = mysqlTable("brands", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logoUrl"),
  description: text("description"),
  
  // Brand Brain AI Parameters
  targetCustomer: text("targetCustomer"), // Who is the ideal customer?
  aesthetic: text("aesthetic"), // Visual style preferences
  mission: text("mission"), // Brand purpose and values
  coreMessaging: text("coreMessaging"), // Key messages and positioning
  
  // Legacy fields (kept for backward compatibility)
  productReferenceImages: text("productReferenceImages"), // JSON array of image URLs
  brandVoice: text("brandVoice"), // Description of brand tone/personality
  visualIdentity: text("visualIdentity"), // Description of visual style
  colorPalette: text("colorPalette"), // JSON: { primary, secondary, accent, etc }
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Brand = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

// Character Casting Tables
export const characters = mysqlTable("characters", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"), // Character details/personality
  imageUrl: text("imageUrl").notNull(), // Master approved image
  isHero: boolean("isHero").default(false).notNull(), // Main character or supporting
  isLocked: boolean("isLocked").default(false).notNull(), // Character lock for consistency
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = typeof characters.$inferInsert;

// Character Library per Brand
export const characterLibrary = mysqlTable("characterLibrary", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull().references(() => brands.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"), // Character archetype/personality
  imageUrl: text("imageUrl").notNull(), // Reference image
  traits: text("traits"), // JSON: personality traits, appearance, etc
  isLocked: boolean("isLocked").default(false).notNull(), // Brand enforcement
  usageCount: int("usageCount").default(0), // Track usage across projects
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CharacterLibrary = typeof characterLibrary.$inferSelect;
export type InsertCharacterLibrary = typeof characterLibrary.$inferInsert;

// Moodboard per Brand
export const moodboards = mysqlTable("moodboards", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull().references(() => brands.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Moodboard = typeof moodboards.$inferSelect;
export type InsertMoodboard = typeof moodboards.$inferInsert;

// Moodboard Images
export const moodboardImages = mysqlTable("moodboardImages", {
  id: int("id").autoincrement().primaryKey(),
  moodboardId: int("moodboardId").notNull().references(() => moodboards.id, { onDelete: "cascade" }),
  imageUrl: text("imageUrl").notNull(),
  description: text("description"),
  colorPalette: text("colorPalette"), // JSON: extracted colors
  composition: text("composition"), // JSON: AI analysis of composition
  style: text("style"), // AI-identified style/mood
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MoodboardImage = typeof moodboardImages.$inferSelect;
export type InsertMoodboardImage = typeof moodboardImages.$inferInsert;

// Brand Voice Profiles for ElevenLabs
export const brandVoiceProfiles = mysqlTable("brandVoiceProfiles", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull().references(() => brands.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  elevenLabsVoiceId: varchar("elevenLabsVoiceId", { length: 255 }), // ElevenLabs voice ID
  description: text("description"), // Voice characteristics
  language: varchar("language", { length: 10 }).default("en"), // ISO 639-1 code
  tone: varchar("tone", { length: 100 }), // Professional, casual, friendly, etc
  speed: int("speed").default(100), // 50 to 200 (percentage)
  pitch: int("pitch").default(100), // 50 to 200 (percentage)
  isDefault: boolean("isDefault").default(false), // Default voice for brand
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrandVoiceProfile = typeof brandVoiceProfiles.$inferSelect;
export type InsertBrandVoiceProfile = typeof brandVoiceProfiles.$inferInsert;

// Generated Voiceovers
export const generatedVoiceovers = mysqlTable("generatedVoiceovers", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  voiceProfileId: int("voiceProfileId").notNull().references(() => brandVoiceProfiles.id, { onDelete: "cascade" }),
  script: text("script").notNull(),
  audioUrl: text("audioUrl").notNull(),
  duration: int("duration"), // Duration in milliseconds
  language: varchar("language", { length: 10 }).default("en"),
  elevenLabsJobId: varchar("elevenLabsJobId", { length: 255 }), // For tracking
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeneratedVoiceover = typeof generatedVoiceovers.$inferSelect;
export type InsertGeneratedVoiceover = typeof generatedVoiceovers.$inferInsert;


// Music Library per Brand
export const musicLibrary = mysqlTable("musicLibrary", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull().references(() => brands.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }),
  description: text("description"),
  audioUrl: text("audioUrl").notNull(),
  duration: int("duration"), // Duration in seconds
  genre: varchar("genre", { length: 100 }),
  mood: varchar("mood", { length: 100 }), // energetic, calm, dramatic, etc
  tempo: int("tempo"), // BPM
  isActive: boolean("isActive").default(true),
  source: varchar("source", { length: 50 }), // epidemic, audiojungle, custom
  sourceId: varchar("sourceId", { length: 255 }), // External ID from API
  usageCount: int("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MusicLibrary = typeof musicLibrary.$inferSelect;
export type InsertMusicLibrary = typeof musicLibrary.$inferInsert;

// Brand Music Preferences
export const brandMusicPreferences = mysqlTable("brandMusicPreferences", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull().references(() => brands.id, { onDelete: "cascade" }),
  preferredGenres: text("preferredGenres"), // JSON: array of genres
  preferredMoods: text("preferredMoods"), // JSON: array of moods
  tempoRange: varchar("tempoRange", { length: 50 }), // e.g., "80-120"
  excludedGenres: text("excludedGenres"), // JSON: genres to avoid
  excludedArtists: text("excludedArtists"), // JSON: artists to avoid
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrandMusicPreferences = typeof brandMusicPreferences.$inferSelect;
export type InsertBrandMusicPreferences = typeof brandMusicPreferences.$inferInsert;

// Project Music Selections
export const projectMusicSelections = mysqlTable("projectMusicSelections", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  musicId: int("musicId").notNull().references(() => musicLibrary.id, { onDelete: "cascade" }),
  startTime: int("startTime"), // Start time in seconds
  duration: int("duration"), // Duration in seconds
  volume: int("volume").default(100), // 0-100
  fadeIn: int("fadeIn").default(0), // Fade in duration in ms
  fadeOut: int("fadeOut").default(0), // Fade out duration in ms
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectMusicSelection = typeof projectMusicSelections.$inferSelect;
export type InsertProjectMusicSelection = typeof projectMusicSelections.$inferInsert;

// Music Suggestions (AI-generated)
export const musicSuggestions = mysqlTable("musicSuggestions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  musicId: int("musicId").notNull().references(() => musicLibrary.id, { onDelete: "cascade" }),
  matchScore: int("matchScore"), // 0-100: how well music matches project mood
  reasoning: text("reasoning"), // Why this music was suggested
  moodAlignment: int("moodAlignment"), // 0-100
  brandAlignment: int("brandAlignment"), // 0-100
  paceAlignment: int("paceAlignment"), // 0-100
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MusicSuggestion = typeof musicSuggestions.$inferSelect;
export type InsertMusicSuggestion = typeof musicSuggestions.$inferInsert;
