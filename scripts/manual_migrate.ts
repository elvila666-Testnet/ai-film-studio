import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import path from 'path';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is required");
}

console.log("[Manual Migrate] Masked Connection:", connectionString.replace(/:[^@:]+@/, ":****@"));

async function runMigration() {
    console.log("Starting manual migration script...");

    let connection;
    if (connectionString.includes('socketPath=')) {
        console.log("Detected Unix Socket connection...");
        const socketPath = connectionString.split('socketPath=')[1]?.split('&')[0];
        const credentialsPart = connectionString.split('://')[1]?.split('@')[0];
        const user = credentialsPart?.split(':')[0];
        const password = credentialsPart?.split(':')[1];
        const dbPart = connectionString.split('@')[1]?.split('/')[1]?.split('?')[0];

        console.log(`[Manual Migrate] Params - User: ${user}, DB: ${dbPart}, Socket: ${socketPath}`);

        connection = await mysql.createConnection({
            user,
            password,
            database: dbPart,
            socketPath: socketPath
        });
    } else {
        console.log("Connecting via TCP...");
        connection = await mysql.createConnection(connectionString);
    }

    console.log("Connection established. Creating users table...");

    await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      openId VARCHAR(64) NOT NULL UNIQUE,
      name TEXT,
      email VARCHAR(320),
      loginMethod VARCHAR(64),
      role ENUM('user', 'admin') DEFAULT 'user' NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

    console.log("Users table verified. Closing connection.");
    await connection.end();
}

runMigration().catch(console.error);
