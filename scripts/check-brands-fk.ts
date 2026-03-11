import mysql from 'mysql2/promise';

async function main() {
    console.log("Connecting to production DB through proxy...");
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3307,
        user: 'filmstudio',
        password: 'xGcpz3Zr4ekNqbL5',
        database: 'ai_film_studio'
    });

    console.log("Connected successfully!");

    let [count]: any = await connection.execute('SELECT COUNT(*) as c FROM brands');
    console.log("Row count in brands:", count[0].c);

    let [projects]: any = await connection.execute('DESCRIBE projects');
    const brandIdCol = projects.find((col: any) => col.Field === 'brandId');
    console.log("projects.brandId type:", brandIdCol?.Type);

    // Get foreign keys on brands
    let [fkeys]: any = await connection.execute(`
        SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_NAME = 'brands' AND TABLE_SCHEMA = 'ai_film_studio';
    `);
    console.log("\nForeign Keys depending on brands:", fkeys);

    await connection.end();
}

main().catch(console.error);
