import mysql from 'mysql2/promise';
async function main() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1', port: 3307, user: 'filmstudio', password: 'xGcpz3Zr4ekNqbL5', database: 'ai_film_studio'
    });
    console.log("\n--- Test BRAND INSERT ---");
    try {
        await connection.execute(`
            INSERT INTO brands (id, userId, name, targetAudience, aesthetic, mission, coreMessaging)
            VALUES ('test-uuid', 1, 'test-name', 'test-audience', 'test-aesthetic', 'test-mission', 'test-messaging')
        `);
        console.log("Insert successful!");
        await connection.execute(`DELETE FROM brands WHERE id = 'test-uuid'`);
    } catch (err: any) {
        console.error("INSERT FAILED:", err.message);
    }
    await connection.end();
}
main();
