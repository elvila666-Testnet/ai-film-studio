import { getDb } from './server/db';
import { characterLibrary } from './drizzle/schema';
import { count } from 'drizzle-orm';

async function check() {
    try {
        const db = await getDb();
        const libCount = await db.select({ value: count() }).from(characterLibrary);
        console.log("DB_STATS_LIB:", { libCount: libCount[0].value });
    } catch (err) {
        console.error("ERROR:", err);
    }
}

check();
