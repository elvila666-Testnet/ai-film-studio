import 'dotenv/config';
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
console.log("[Drizzle Config] DATABASE_URL present:", !!connectionString);

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

let uriObj: any = {};
if (connectionString.includes("socketPath=")) {
  try {
    const socketPath = connectionString.match(/socketPath=([^&?]+)/)?.[1];
    const userPassMatch = connectionString.match(/mysql:\/\/([^:]+):([^@]+)@/);
    const dbMatch = connectionString.match(/\/([^/?]+)\?/);

    uriObj = {
      user: userPassMatch?.[1],
      password: userPassMatch?.[2],
      database: dbMatch?.[1],
      socketPath: socketPath
    };
    console.log("[Drizzle Config] Parsed Unix Socket. DB:", uriObj.database, "Path:", uriObj.socketPath);
  } catch (e) {
    console.log("[Drizzle Config] Failed regex parse of Unix socket URL");
  }
} else {
  // Standard TCP URL
  try {
    const url = new URL(connectionString);
    uriObj = {
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.replace("/", ""),
      port: parseInt(url.port) || 3306,
    };
    console.log("[Drizzle Config] Parsed TCP. DB:", uriObj.database, "Host:", uriObj.host);
  } catch (e) {
    console.log("[Drizzle Config] Standard URL parse failed");
  }
}

console.log("[Drizzle Config] Final Credentials (Keys):", Object.keys(uriObj).join(", "));

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
