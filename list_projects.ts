import { getDb } from './server/db';
import { projects } from './drizzle/schema';

async function check() {
    try {
        const db = await getDb();
        const allProjects = await db.select().from(projects);
        console.log("ALL_PROJECTS:", JSON.stringify(allProjects, null, 2));
    } catch (err) {
        console.error("ERROR:", err);
    }
}

check();
