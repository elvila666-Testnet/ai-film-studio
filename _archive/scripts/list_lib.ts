import { getDb } from './server/db';
import { characterLibrary } from './drizzle/schema';

async function check() {
    try {
        const db = await getDb();
        const allLib = await db.select().from(characterLibrary);
        console.log("ALL_LIB_CHARS:", JSON.stringify(allLib, null, 2));
    } catch (err) {
        console.error("ERROR:", err);
    }
}

check();
