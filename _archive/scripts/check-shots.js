import mysql from 'mysql2/promise';
import 'dotenv/config';

async function checkShots() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const [rows] = await connection.execute('DESCRIBE shots');
    console.log('Shots columns:', rows);
    await connection.end();
}

checkShots().catch(console.error);
