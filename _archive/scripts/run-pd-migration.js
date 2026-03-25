import mysql from 'mysql2/promise';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

async function runMigration() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    // Statements from 0006_vengeful_vector.sql, cleaned up
    const sqlStatements = [
        `CREATE TABLE IF NOT EXISTS \`productionDesignProps\` (
            \`id\` int AUTO_INCREMENT NOT NULL,
            \`setId\` int,
            \`projectId\` int NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`description\` text,
            \`symbolism\` text,
            \`imageGenerationPrompt\` text,
            \`imageUrl\` longtext,
            \`createdAt\` timestamp NOT NULL DEFAULT (now()),
            CONSTRAINT \`productionDesignProps_id\` PRIMARY KEY(\`id\`)
        )`,
        `CREATE TABLE IF NOT EXISTS \`productionDesignSets\` (
            \`id\` int AUTO_INCREMENT NOT NULL,
            \`projectId\` int NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`description\` mediumtext,
            \`atmospherePhilosophy\` mediumtext,
            \`imageGenerationPrompt\` mediumtext,
            \`imageUrl\` longtext,
            \`referenceImageUrl\` longtext,
            \`status\` varchar(50) DEFAULT 'draft',
            \`createdAt\` timestamp NOT NULL DEFAULT (now()),
            \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT \`productionDesignSets_id\` PRIMARY KEY(\`id\`)
        )`,
        `ALTER TABLE \`shots\` ADD COLUMN IF NOT EXISTS \`referenceImageUrl\` longtext`,
        // Trap the unique constraint if it already exists
        `ALTER TABLE \`projectContent\` ADD CONSTRAINT \`projectContent_projectId_unique\` UNIQUE(\`projectId\`)`,
        `ALTER TABLE \`productionDesignProps\` ADD CONSTRAINT \`productionDesignProps_setId_productionDesignSets_id_fk\` FOREIGN KEY (\`setId\`) REFERENCES \`productionDesignSets\`(\`id\`) ON DELETE cascade ON UPDATE no action`,
        `ALTER TABLE \`productionDesignProps\` ADD CONSTRAINT \`productionDesignProps_projectId_projects_id_fk\` FOREIGN KEY (\`projectId\`) REFERENCES \`projects\`(\`id\`) ON DELETE cascade ON UPDATE no action`,
        `ALTER TABLE \`productionDesignSets\` ADD CONSTRAINT \`productionDesignSets_projectId_projects_id_fk\` FOREIGN KEY (\`projectId\`) REFERENCES \`projects\`(\`id\`) ON DELETE cascade ON UPDATE no action`
    ];

    for (const sql of sqlStatements) {
        try {
            console.log('Executing:', sql.substring(0, 100) + '...');
            await connection.execute(sql);
            console.log('Success');
        } catch (err) {
            console.error('Failed:', err.message);
            // Ignore IF NOT EXISTS failures if they happen
            if (err.message.includes('already exists') || err.message.includes('Duplicate column name')) {
                console.log('Skipping (already exists)');
            } else {
                // throw err; // Don't throw, just log
            }
        }
    }

    await connection.end();
}

runMigration().catch(console.error);
