import mysql from 'mysql2/promise';

async function run() {
    try {
        const conn = await mysql.createConnection('mysql://root:password@localhost:3306/ai_film_studio');
        await conn.execute(`SET FOREIGN_KEY_CHECKS = 0;`);
        await conn.execute(`TRUNCATE TABLE modelConfigs;`);
        await conn.execute(`TRUNCATE TABLE userModelFavorites;`);
        await conn.execute(`SET FOREIGN_KEY_CHECKS = 1;`);
        console.log('Truncated all models and favorites.');
        process.exit(0);
    } catch (err) {
        console.error('Error truncating models:', err);
        process.exit(1);
    }
}
run();
