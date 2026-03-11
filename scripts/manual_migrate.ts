import mysql from "mysql2/promise";
import { config } from "dotenv";

config();

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("No DATABASE_URL found");
    return;
  }
  const conn = await mysql.createConnection(url);
  try {
    await conn.query("ALTER TABLE projectContent ADD COLUMN proposalStatus enum('draft','pending_review','approved') DEFAULT 'draft'");
  } catch(e: any) { console.log(e.message); }
  try {
    await conn.query("ALTER TABLE projectContent ADD COLUMN creativeProposal mediumtext");
  } catch(e: any) { console.log(e.message); }
  try {
    await conn.query("ALTER TABLE projectContent ADD COLUMN brandValidationFeedback text");
  } catch(e: any) { console.log(e.message); }
  try {
    await conn.query("ALTER TABLE projectContent ADD COLUMN technicalScript mediumtext");
  } catch(e: any) { console.log(e.message); }
  console.log('Done altering.');
  await conn.end();
  process.exit(0);
}
run();
