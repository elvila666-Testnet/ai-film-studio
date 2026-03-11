
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function fixColumns() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return;
    const connection = await mysql.createConnection(dbUrl);
    try {
        console.log("Expanding column sizes for base64 support...");
        await connection.query("ALTER TABLE `characters` MODIFY COLUMN `imageUrl` LONGTEXT");
        await connection.query("ALTER TABLE `characters` MODIFY COLUMN `referenceImageUrl` LONGTEXT");
        console.log("Success: Columns modified to LONGTEXT");
    } catch (e) {
        console.error("Error modifying columns:", e.message);
    }
    await connection.end();
}
fixColumns();
