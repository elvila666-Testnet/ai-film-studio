import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

async function run() {
    try {
        console.log("Connecting...");
        const pool = mysql.createPool("mysql://root:password@localhost:3306/ai_film_studio");
        const db = drizzle(pool);

        console.log("Describing projects table...");
        const result = await db.execute(sql`DESCRIBE projects;`);
        console.log(result[0]);

        console.log("SUCCESS");
    } catch (e) {
        console.error("CRASH:", e);
    }
    process.exit(0);
}

run();
