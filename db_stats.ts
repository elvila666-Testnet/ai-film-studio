import { getDb } from './server/db';
import { characters, projects } from './drizzle/schema';
import { count } from 'drizzle-orm';

async function check() {
    try {
        const db = await getDb();
        const charCount = await db.select({ value: count() }).from(characters);
        const projectCount = await db.select({ value: count() }).from(projects);
        console.log("DB_STATS:", { charCount: charCount[0].value, projectCount: projectCount[0].value });
    } catch (err) {
        console.error("ERROR:", err);
    }
}

check();
