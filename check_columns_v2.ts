import { getDb } from './server/db';

async function check() {
    try {
        const db = await getDb();
        const [rows] = await db.session.client.query('DESCRIBE projectContent');
        console.log("COLUMNS:", rows.map(r => r.Field).join(", "));
    } catch (err) {
        console.error("ERROR:", err);
    }
}

check();
