import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users, projects, projectContent, storyboardImages, referenceImages, generatedVideos, editorProjects, editorClips, editorTracks, editorExports, editorComments, InsertProjectContent, InsertEditorProject, InsertEditorClip, InsertEditorTrack, InsertEditorExport, InsertEditorComment, animaticConfigs, InsertAnimaticConfig, storyboardFrameOrder, storyboardFrameHistory, storyboardFrameNotes, modelConfigs, InsertModelConfig, userModelFavorites, InsertUserModelFavorite } from "../drizzle/schema";
import { ENV } from './_core/env';
import { randomUUID } from "node:crypto";


let _db: any = null;
let _pool: mysql.Pool | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  const dbUrl = process.env.DATABASE_URL || ENV.databaseUrl;
  if (!_db && dbUrl) {
    try {
      if (!_pool) {
        console.log("[Database] Initializing connection pool...");

        // Handle Cloud Run Unix Sockets
        if (dbUrl.includes('unix_socket=')) {
          // Use http scheme and dummy host for easier parsing of the URI
          const url = new URL(dbUrl.replace('mysql://', 'http://').replace('@/', '@localhost/'));
          const socketPath = url.searchParams.get('unix_socket') || url.searchParams.get('socketPath');
          const user = url.username;
          const password = decodeURIComponent(url.password);
          const database = url.pathname.substring(1); // remove leading /

          console.log(`[Database] Using Unix socket: ${socketPath}`);
          _pool = mysql.createPool({
            user,
            password,
            database,
            socketPath: socketPath || undefined,
            waitForConnections: true,
            connectionLimit: 10,
          });
        } else {
          // Standard TCP connection
          _pool = mysql.createPool(dbUrl);
        }
      }
      _db = drizzle(_pool as any);
      console.log("[Database] Drizzle initialized");
    } catch (error) {
      console.error("[Database] Failed to initialize:", error);
      _db = null;
    }
  }
  return _db;
}









































// Video Editor Functions

























// Comments









// Animatic Configuration Functions









// Storyboard Reordering Functions




// Storyboard Frame History Functions




// Storyboard Frame Notes Functions







/**
 * Save storyboard image with character reference and seed
 */


/**
 * Get storyboard image with character reference
 */


/**
 * Get character reference from first shot (for consistency across all shots)
 */


// ============================================================================
// BRAND MANAGEMENT FUNCTIONS
// ============================================================================

import { brands, characters } from "../drizzle/schema";

/**
 * Create a new brand for a user
 */


/**
 * Get brand by ID
 */


/**
 * Get all brands for a user
 */


/**
 * Update brand
 */


/**
 * Delete brand
 */


// ============================================================================
// CHARACTER MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create a character for a project
 */


/**
 * Get character by ID
 */


/**
 * Get all characters for a project
 */


/**
 * Get locked character for a project
 */


/**
 * Lock a character for a project (only one locked per project)
 */


/**
 * Unlock all characters for a project
 */


/**
 * Update character
 */


/**
 * Delete character
 */


/**
 * Update storyboard image video URL
 */


/**
 * Update storyboard image video URL
 */


// Model Configuration Functions










import { repairSchema } from "./db/repair";

// ... existing code ...






export * from "./db/users";
export * from "./db/projects";
export * from "./db/storyboard";
export * from "./db/referenceImages";
export * from "./db/videos";
export * from "./db/editor";
export * from "./db/animatic";
export * from "./db/brands";
export * from "./db/characters";
export * from "./db/models";
