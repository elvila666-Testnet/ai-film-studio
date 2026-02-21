/**
 * Enhanced Database Schema for Brand Brain-Centric Architecture
 * 
 * This schema implements a brand-first approach where:
 * - Brands are the primary organizational unit
 * - Projects belong to brands and inherit brand guidelines
 * - All content generation is constrained by brand parameters
 * - AI systems continuously analyze and enforce brand compliance
 */

import { mysqlTable, int, varchar, text, timestamp, boolean, decimal, mysqlEnum, json } from "drizzle-orm/mysql-core";
import { users, projects } from "./schema";

// ============================================================================
// ENHANCED BRAND BRAIN SYSTEM
// ============================================================================

/**
 * Enhanced Brands table with comprehensive AI-driven brand parameters
 */
export const brandsEnhanced = mysqlTable("brands_enhanced", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Basic Info
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logoUrl"),
  description: text("description"), // Brand overview

  // Brand Brain AI Parameters
  targetCustomer: text("targetCustomer"), // AI-analyzed: Who is the ideal customer?
  aesthetic: text("aesthetic"), // AI-analyzed: Visual style preferences
  mission: text("mission"), // AI-analyzed: Brand purpose and values
  coreMessaging: text("coreMessaging"), // AI-analyzed: Key messages and positioning

  // Visual Identity
  colorPalette: json("colorPalette"), // { primary, secondary, accent, neutral, etc }
  typography: json("typography"), // { headingFont, bodyFont, sizes, weights }
  visualStyle: varchar("visualStyle", { length: 100 }), // minimalist, bold, playful, professional, etc

  // Brand Voice & Tone
  voiceTone: varchar("voiceTone", { length: 100 }), // friendly, professional, casual, authoritative, etc
  languagePreferences: json("languagePreferences"), // { keywords, avoidWords, tone, formality }

  // Content Guidelines
  contentGuidelines: text("contentGuidelines"), // Detailed brand guidelines
  dosList: json("dosList"), // What should be in content
  dontsList: json("dontsList"), // What should NOT be in content

  // AI Compliance Settings
  aiComplianceLevel: mysqlEnum("aiComplianceLevel", ["strict", "moderate", "flexible"]).default("moderate"),
  autoRejectNonCompliant: boolean("autoRejectNonCompliant").default(true),

  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrandEnhanced = typeof brandsEnhanced.$inferSelect;
export type InsertBrandEnhanced = typeof brandsEnhanced.$inferInsert;

/**
 * Brand Intelligence Analysis - AI-generated insights about the brand
 */
export const brandIntelligence = mysqlTable("brand_intelligence", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull().references(() => brandsEnhanced.id, { onDelete: "cascade" }),

  // AI Analysis Results
  competitorAnalysis: text("competitorAnalysis"), // JSON: analyzed competitors
  audienceInsights: text("audienceInsights"), // JSON: audience demographics, preferences
  trendAnalysis: text("trendAnalysis"), // JSON: current trends relevant to brand
  strengthsWeaknesses: text("strengthsWeaknesses"), // JSON: brand SWOT analysis

  // Recommendations
  contentRecommendations: json("contentRecommendations"), // AI suggestions for content
  styleRecommendations: json("styleRecommendations"), // AI suggestions for visual style
  messagingRecommendations: json("messagingRecommendations"), // AI suggestions for messaging

  // Performance Metrics
  brandConsistencyScore: decimal("brandConsistencyScore", { precision: 3, scale: 2 }), // 0-100
  audienceResonanceScore: decimal("audienceResonanceScore", { precision: 3, scale: 2 }), // 0-100

  lastAnalyzedAt: timestamp("lastAnalyzedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrandIntelligence = typeof brandIntelligence.$inferSelect;
export type InsertBrandIntelligence = typeof brandIntelligence.$inferInsert;

// ============================================================================
// CASTING & CHARACTER SYSTEM
// ============================================================================

/**
 * Character Library - Centralized per brand
 */
export const characterLibrary = mysqlTable("character_library", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull().references(() => brandsEnhanced.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }), // hero, supporting, extra, etc
  description: text("description"), // Character personality and traits

  // Visual Reference
  referenceImageUrl: text("referenceImageUrl"), // Master approved character image
  alternativeImages: json("alternativeImages"), // Array of approved variations

  // Character Specifications
  ageRange: varchar("ageRange", { length: 50 }),
  ethnicity: varchar("ethnicity", { length: 100 }),
  appearance: text("appearance"), // Detailed appearance description
  voiceProfile: varchar("voiceProfile", { length: 100 }), // For ElevenLabs integration

  // Brand Alignment
  brandAlignmentScore: decimal("brandAlignmentScore", { precision: 3, scale: 2 }), // 0-100
  usageFrequency: int("usageFrequency").default(0), // How many times used

  isApproved: boolean("isApproved").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CharacterLibrary = typeof characterLibrary.$inferSelect;
export type InsertCharacterLibrary = typeof characterLibrary.$inferInsert;

/**
 * Cast Assignments - Which characters are used in which projects
 */
export const castAssignments = mysqlTable("cast_assignments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  characterId: int("characterId").notNull().references(() => characterLibrary.id, { onDelete: "cascade" }),

  role: varchar("role", { length: 100 }), // hero, supporting, extra
  isLocked: boolean("isLocked").default(false), // Prevent changes once locked

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CastAssignment = typeof castAssignments.$inferSelect;
export type InsertCastAssignment = typeof castAssignments.$inferInsert;

// ============================================================================
// MOODBOARD SYSTEM
// ============================================================================

/**
 * Moodboards - Visual reference collections per brand
 */
export const moodboards = mysqlTable("moodboards", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull().references(() => brandsEnhanced.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // visual, technical, storyboard, etc

  // AI Analysis
  dominantColors: json("dominantColors"), // Extracted color palette
  styleAnalysis: text("styleAnalysis"), // AI description of style
  moodAnalysis: text("moodAnalysis"), // AI description of mood/feeling

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Moodboard = typeof moodboards.$inferSelect;
export type InsertMoodboard = typeof moodboards.$inferInsert;

/**
 * Moodboard Images - Individual reference images
 */
export const moodboardImages = mysqlTable("moodboard_images", {
  id: int("id").autoincrement().primaryKey(),
  moodboardId: int("moodboardId").notNull().references(() => moodboards.id, { onDelete: "cascade" }),

  imageUrl: text("imageUrl").notNull(),
  title: varchar("title", { length: 255 }),
  description: text("description"),

  // AI Analysis
  colorPalette: json("colorPalette"),
  composition: text("composition"), // AI analysis of composition
  mood: varchar("mood", { length: 100 }), // AI-detected mood
  relevanceScore: decimal("relevanceScore", { precision: 3, scale: 2 }), // 0-100

  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MoodboardImage = typeof moodboardImages.$inferSelect;
export type InsertMoodboardImage = typeof moodboardImages.$inferInsert;

// ============================================================================
// AI AUDIO & MUSIC SYSTEM
// ============================================================================

/**
 * Voice Profiles - ElevenLabs voice configurations per brand
 */
export const voiceProfiles = mysqlTable("voice_profiles", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull().references(() => brandsEnhanced.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  elevenLabsVoiceId: varchar("elevenLabsVoiceId", { length: 255 }).notNull(),

  // Voice Characteristics
  gender: varchar("gender", { length: 50 }),
  age: varchar("age", { length: 50 }),
  accent: varchar("accent", { length: 100 }),
  tone: varchar("tone", { length: 100 }), // professional, friendly, casual, etc

  // Settings
  stability: decimal("stability", { precision: 3, scale: 2 }), // 0-1
  similarityBoost: decimal("similarityBoost", { precision: 3, scale: 2 }), // 0-1

  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VoiceProfile = typeof voiceProfiles.$inferSelect;
export type InsertVoiceProfile = typeof voiceProfiles.$inferInsert;

/**
 * Music Preferences - Brand music guidelines and recommendations
 */
export const musicPreferences = mysqlTable("music_preferences", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull().references(() => brandsEnhanced.id, { onDelete: "cascade" }),

  // Mood Preferences
  preferredMoods: json("preferredMoods"), // Array of moods: uplifting, calm, energetic, etc
  preferredGenres: json("preferredGenres"), // Array of genres
  preferredInstruments: json("preferredInstruments"), // Array of instruments

  // Tempo Preferences
  tempoRange: json("tempoRange"), // { min: BPM, max: BPM }

  // Energy Level
  energyLevel: varchar("energyLevel", { length: 50 }), // low, medium, high

  // Exclusions
  avoidMoods: json("avoidMoods"),
  avoidGenres: json("avoidGenres"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MusicPreferences = typeof musicPreferences.$inferSelect;
export type InsertMusicPreferences = typeof musicPreferences.$inferInsert;

/**
 * Generated Audio - Voiceovers and narration
 */
export const generatedAudio = mysqlTable("generated_audio", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  voiceProfileId: int("voiceProfileId").notNull().references(() => voiceProfiles.id),

  text: text("text").notNull(),
  audioUrl: text("audioUrl"),

  status: mysqlEnum("status", ["pending", "generating", "completed", "failed"]).default("pending"),
  duration: int("duration"), // in milliseconds

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GeneratedAudio = typeof generatedAudio.$inferSelect;
export type InsertGeneratedAudio = typeof generatedAudio.$inferInsert;

/**
 * Music Tracks - Selected music for projects
 */
export const musicTracks = mysqlTable("music_tracks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),

  title: varchar("title", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }),
  source: varchar("source", { length: 100 }), // epidemic, audiojungle, etc
  sourceId: varchar("sourceId", { length: 255 }),

  // Characteristics
  mood: varchar("mood", { length: 100 }),
  genre: varchar("genre", { length: 100 }),
  tempo: int("tempo"), // BPM
  duration: int("duration"), // in milliseconds

  // Usage
  audioUrl: text("audioUrl"),
  licenseUrl: text("licenseUrl"),

  // Scoring
  relevanceScore: decimal("relevanceScore", { precision: 3, scale: 2 }), // 0-100

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MusicTrack = typeof musicTracks.$inferSelect;
export type InsertMusicTrack = typeof musicTracks.$inferInsert;

// ============================================================================
// ENHANCED PROJECTS TABLE
// ============================================================================

/**
 * Updated Projects table with brand relationship
 */
export const projectsEnhanced = mysqlTable("projects_enhanced", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  brandId: int("brandId").notNull().references(() => brandsEnhanced.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  // Brand Compliance
  brandComplianceScore: decimal("brandComplianceScore", { precision: 3, scale: 2 }), // 0-100
  lastComplianceCheck: timestamp("lastComplianceCheck"),

  // Status
  status: mysqlEnum("status", ["draft", "in_progress", "review", "approved", "completed"]).default("draft"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectEnhanced = typeof projectsEnhanced.$inferSelect;
export type InsertProjectEnhanced = typeof projectsEnhanced.$inferInsert;
