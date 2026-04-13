import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    const url = process.env.DATABASE_URL || "mysql://filmstudio:xGcpz3Zr4ekNqbL5@127.0.0.1:3307/ai_film_studio";
    const connection = await mysql.createConnection(url);
    
    console.log("Connected to DB!");
    
    const sqlPath = path.join(__dirname, '../drizzle/0011_magenta_solo.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // drizzle separates statements using `--> statement-breakpoint`
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
    
    for (let statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        try {
            await connection.query(statement);
            console.log("Success.");
        } catch (err) {
            console.error("Error executing statement:", err.message);
        }
    }
    
    await connection.end();
}

run().catch(console.error);
