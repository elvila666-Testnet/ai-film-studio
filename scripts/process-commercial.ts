import dotenv from "dotenv";
dotenv.config();

// We must use dynamic imports after dotenv.config() 
// to ensure ENV is initialized with values from .env
async function main() {
    console.log("Loading services...");
    const { breakupScriptToScenes, breakupSceneToShots } = await import("../server/src/services/aiOrchestrator");
    const { getDb, scenes, projectContent } = await import("../server/db");
    const { eq } = await import("drizzle-orm");

    const projectId = 16; // The project we just created
    const userId = "1";
    const db = await getDb();
    if (!db) throw new Error("DB unreachable");

    const projectResult = await db.select().from(projectContent).where(eq(projectContent.projectId, projectId)).limit(1);
    const scriptContent = projectResult[0]?.script;

    if (!scriptContent) {
        console.error("No script found for project 16");
        process.exit(1);
    }

    console.log("1. Breaking script into scenes...");
    await breakupScriptToScenes(projectId, scriptContent, userId);

    console.log("2. Fetching generated scenes...");
    const generatedScenes = await db.select().from(scenes).where(eq(scenes.projectId, projectId));
    console.log(`Found ${generatedScenes.length} scenes.`);

    console.log("3. Breaking scenes into shots...");
    for (const scene of generatedScenes) {
        console.log(`Processing Scene ${scene.order}: ${scene.title}...`);
        try {
            await breakupSceneToShots(scene.id, userId);
        } catch (e) {
            console.error(`Failed to process scene ${scene.id}:`, e);
        }
    }

    console.log("Success! Scenes and shots generated.");
}

main().catch(console.error);
