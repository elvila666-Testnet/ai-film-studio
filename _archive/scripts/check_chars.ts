import { getDb } from './server/db';
import { characters } from './drizzle/schema';
import { desc } from 'drizzle-orm';

async function check() {
    try {
        const db = await getDb();
        const latestChars = await db.select().from(characters).orderBy(desc(characters.id)).limit(5);
        console.log("LATEST_CHARACTERS:", JSON.stringify(latestChars, null, 2));
    } catch (err) {
        console.error("ERROR:", err);
    }
}

check();
