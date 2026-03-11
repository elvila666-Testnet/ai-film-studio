import { getDb } from './server/db';
import { sql } from 'drizzle-orm';

async function check() {
    try {
        const db = await getDb();
        const results = await db.execute(sql`DESCRIBE projectContent`);
        console.log("COLUMNS:", JSON.stringify(results, null, 2));
    } catch (err) {
        console.error("ERROR:", err);
    }
}

check();
