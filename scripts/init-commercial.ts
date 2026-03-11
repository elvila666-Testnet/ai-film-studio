import dotenv from "dotenv";
dotenv.config();
import { createProject, updateProjectContent, getDb } from "../server/db";
import { users } from "../drizzle/schema";
import fs from "fs";
import path from "path";

async function main() {
    const db = await getDb();
    if (!db) {
        console.error("Database not available");
        process.exit(1);
    }

    // Use the first user found or default to 1
    const allUsers = await db.select().from(users).limit(1);
    const userId = allUsers[0]?.id || 1;
    const projectName = "El Asistente Invisible";

    console.log(`Creating project "${projectName}" for user ${userId}...`);

    const projectId = await createProject(userId, projectName);
    console.log(`Project created with ID: ${projectId}`);

    const scriptPath = path.join(process.cwd(), "docs", "commercial-detailed-script.md");
    const scriptContent = fs.readFileSync(scriptPath, "utf-8");

    console.log(`Ingesting script (${scriptContent.length} chars)...`);
    await updateProjectContent(projectId, {
        script: scriptContent,
        brief: "Comercial AI Film Studio - El Asistente Invisible"
    });

    console.log("Success! Project initialized.");
    console.log(`PROJECT_ID=${projectId}`);
}

main().catch(console.error);
