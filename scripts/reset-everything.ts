import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function reset() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("No DATABASE_URL found in .env");
  
  const conn = await mysql.createConnection(url);
  
  console.log("Connected to database. Disabling foreign key checks...");
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  
  const [rows] = await conn.query('SHOW TABLES');
  const tables = (rows as any[]).map(row => Object.values(row)[0]);
  
  if (tables.length === 0) {
      console.log("No tables found.");
  } else {
      for (const table of tables) {
        console.log(`Dropping table ${table}...`);
        await conn.query(`DROP TABLE IF EXISTS \`${table}\``);
      }
      console.log("All tables dropped successfully.");
  }
  
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log("Re-enabled foreign key checks. Ready for schema push.");
  process.exit(0);
}

reset().catch(console.error);
