const { getDb } = require('./server/db');
const { projects, scenes, shots, storyboardImages } = require('./drizzle/schema');
const { eq } = require('drizzle-orm');

async function debug() {
    const db = await getDb();
    if (!db) {
        console.log("No DB");
        return;
    }
    const projectId = 14;
    const projectList = await db.select().from(projects).where(eq(projects.id, projectId));
    console.log("Project:", projectList[0]?.name);

    const sceneList = await db.select().from(scenes).where(eq(scenes.projectId, projectId));
    console.log("Scenes count:", sceneList.length);

    const sceneIds = sceneList.map(s => s.id);
    if (sceneIds.length > 0) {
        const { inArray } = require('drizzle-orm');
        const shotList = await db.select().from(shots).where(inArray(shots.sceneId, sceneIds));
        console.log("Shots count:", shotList.length);
    } else {
        console.log("No shots because no scenes");
    }

    const images = await db.select().from(storyboardImages).where(eq(storyboardImages.projectId, projectId));
    console.log("Storyboard Images count:", images.length);
    process.exit(0);
}

debug().catch(e => {
    console.error(e);
    process.exit(1);
});
