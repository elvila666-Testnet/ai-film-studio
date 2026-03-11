import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { projects } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function run() {
    try {
        console.log("Connecting...");
        const pool = mysql.createPool("mysql://root:password@localhost:3306/ai_film_studio");
        const db = drizzle(pool);

        console.log("Attempting to toggle script lock on project 1...");
        await db.update(projects)
            .set({ isScriptLocked: true })
            .where(eq(projects.id, 1));

        console.log("SUCCESS");
    } catch (e) {
        console.error("CRASH:", e);
    }
    process.exit(0);
}

run();
