import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

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

    try {
        await connection.beginTransaction();

        // 1. Drop foreign key constraints
        const childTables = [
            { table: 'brandMusicPreferences', fk: 'brandMusicPreferences_brandId_brands_id_fk' },
            { table: 'brandVoiceProfiles', fk: 'brandVoiceProfiles_brandId_brands_id_fk' },
            { table: 'characterLibrary', fk: 'characterLibrary_brandId_brands_id_fk' },
            { table: 'moodboards', fk: 'moodboards_brandId_brands_id_fk' },
            { table: 'musicLibrary', fk: 'musicLibrary_brandId_brands_id_fk' },
            { table: 'projects', fk: 'projects_brandId_brands_id_fk' },
            { table: 'brandAssets', fk: 'brandAssets_brandId_brands_id_fk' }
        ];

        for (const { table, fk } of childTables) {
            try {
                await connection.execute(`ALTER TABLE ${table} DROP FOREIGN KEY ${fk}`);
                console.log(`Dropped FK ${fk} on ${table}`);
            } catch (e: any) {
                console.log(`Skipped dropping FK ${fk} on ${table} (might not exist)`);
            }
        }

        // 2. Add temporary UUID column to brands
        try {
            await connection.execute(`ALTER TABLE brands ADD COLUMN new_id VARCHAR(36)`);
        } catch (e) { console.log('new_id already exists'); }

        const [brands]: any = await connection.execute('SELECT id FROM brands');
        const idMap = new Map();

        for (const brand of brands) {
            const newUid = randomUUID();
            idMap.set(brand.id, newUid);
            await connection.execute(`UPDATE brands SET new_id = ? WHERE id = ?`, [newUid, brand.id]);
        }

        // 3. Update child tables (add temp column, copy mapped, drop old, rename new)
        for (const { table } of childTables) {
            try {
                await connection.execute(`ALTER TABLE ${table} ADD COLUMN new_brandId VARCHAR(36)`);
                const [rows]: any = await connection.execute(`SELECT id, brandId FROM ${table} WHERE brandId IS NOT NULL`);
                for (const row of rows) {
                    if (idMap.has(row.brandId)) {
                        await connection.execute(`UPDATE ${table} SET new_brandId = ? WHERE id = ?`, [idMap.get(row.brandId), row.id]);
                    }
                }
            } catch (e: any) {
                console.log(`Error updating child table temp column ${table}: ` + e.message);
            }
        }

        // 4. Modify columns taking constraints off
        // Drop primary key on brands
        await connection.execute(`ALTER TABLE brands MODIFY id INT NOT NULL`); // Remove auto_increment
        await connection.execute(`ALTER TABLE brands DROP PRIMARY KEY`);

        // 5. Swap columns
        await connection.execute(`ALTER TABLE brands DROP COLUMN id`);
        await connection.execute(`ALTER TABLE brands CHANGE new_id id VARCHAR(36) NOT NULL PRIMARY KEY`);

        for (const { table } of childTables) {
            try {
                const [desc]: any = await connection.execute(`DESCRIBE ${table}`);
                const hasBrandId = desc.find((c: any) => c.Field === 'brandId');
                if (hasBrandId) {
                    await connection.execute(`ALTER TABLE ${table} DROP COLUMN brandId`);
                    let nullability = "NOT NULL";
                    if (table === "projects") nullability = "NULL"; // projects.brandId is nullable
                    await connection.execute(`ALTER TABLE ${table} CHANGE new_brandId brandId VARCHAR(36) ${nullability}`);
                }
            } catch (e: any) {
                console.log(`Error swapping child columns on ${table}: ` + e.message);
            }
        }

        // 6. Restore Foreign Key constraints
        for (const { table, fk } of childTables) {
            try {
                let onDelete = "CASCADE";
                if (table === "projects") onDelete = "SET NULL";
                await connection.execute(`ALTER TABLE ${table} ADD CONSTRAINT ${fk} FOREIGN KEY (brandId) REFERENCES brands(id) ON DELETE ${onDelete}`);
                console.log(`Restored FK ${fk} on ${table}`);
            } catch (e: any) {
                console.log(`Failed to restore FK on ${table}: ` + e.message);
            }
        }

        await connection.commit();
        console.log("Migration completed successfully!");
    } catch (e) {
        await connection.rollback();
        console.error("Migration failed, rolling back:", e);
    }

    await connection.end();
}

main().catch(console.error);
