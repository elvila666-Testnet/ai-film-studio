import mysql from 'mysql2/promise';
import 'dotenv/config';

async function checkTables() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const [rows] = await connection.execute('SHOW TABLES');
    console.log('Tables:', rows);
    await connection.end();
}

checkTables().catch(console.error);
