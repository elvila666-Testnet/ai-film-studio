import mysql from 'mysql2/promise';

async function run() {
    try {
        const conn = await mysql.createConnection('mysql://root:password@localhost:3306/ai_film_studio');
        const [result] = await conn.execute(`DELETE FROM modelConfigs WHERE provider IN ('replicate', 'apiyi', 'Replicate', 'Apiyi')`);
        console.log('Purged legacy models from database.', result);
        process.exit(0);
    } catch (err) {
        console.error('Error purging models:', err);
        process.exit(1);
    }
}
run();
