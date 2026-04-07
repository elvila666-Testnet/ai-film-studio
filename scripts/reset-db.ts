import mysql from 'mysql2/promise';
import 'dotenv/config';

async function main() {
  console.log("Connecting to Database using env vars...");
  const db = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log("Disabling foreign key checks...");
  await db.execute('SET FOREIGN_KEY_CHECKS = 0;');
  
  console.log("Fetching tables...");
  const [rows] = await db.execute('SHOW TABLES;');
  
  for (const row of rows as any[]) {
    const table = Object.values(row)[0];
    await db.execute(`DROP TABLE IF EXISTS \`${table}\`;`);
    console.log(`Dropped table: ${table}`);
  }
  
  await db.execute('SET FOREIGN_KEY_CHECKS = 1;');
  await db.end();
  console.log('Database wiped purely and cleanly. Ready for Drizzle push.');
}

main().catch(console.error);
