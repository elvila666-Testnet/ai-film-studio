import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { ENV } from './_core/env';


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
        if (dbUrl.includes('unix_socket=') || dbUrl.includes('socketPath=')) {
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

// BRAND MANAGEMENT FUNCTIONS


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
