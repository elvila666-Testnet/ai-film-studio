import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

/**
 * Ensures the production database matches the latest schema for Brand Intelligence.
 * This is a safety measure because Cloud Build migrations have been unreliable.
 */
export async function repairSchema() {
    const db = await getDb();
    if (!db) {
        console.error("[Repair] Database not available for schema repair");
        return;
    }

    console.log("[Repair] Checking schema for brands and projectContent...");

    const brandColumns = [
        { name: "targetAudience", type: "text" },
        { name: "aesthetic", type: "text" },
        { name: "mission", type: "text" },
        { name: "coreMessaging", type: "text" },
        { name: "brandVoice", type: "text" },
        { name: "negativeConstraints", type: "text" },
        { name: "description", type: "text" },
        { name: "logoUrl", type: "text" },
        { name: "visualIdentity", type: "text" },
        { name: "productReferenceImages", type: "text" },
        { name: "colorPalette", type: "json" }
    ];

    const projectContentColumns = [
        { name: "brandVoice", type: "text" },
        { name: "visualIdentity", type: "text" },
        { name: "colorPalette", type: "json" },
        { name: "synopsis", type: "text" }
    ];

    try {
        // 1. Repair brands table
        for (const col of brandColumns) {
            try {
                await db.execute(sql.raw(`ALTER TABLE \`brands\` ADD COLUMN \`${col.name}\` ${col.type}`));
                console.log(`[Repair] Added column ${col.name} to brands`);
            } catch (err: any) {
                // Ignore if column already exists (Error 1060)
                if (!err.message.includes("Duplicate column name")) {
                    console.warn(`[Repair] Error adding ${col.name} to brands:`, err.message);
                }
            }
        }

        // 2. Repair projectContent table
        for (const col of projectContentColumns) {
            try {
                await db.execute(sql.raw(`ALTER TABLE \`projectContent\` ADD COLUMN \`${col.name}\` ${col.type}`));
                console.log(`[Repair] Added column ${col.name} to projectContent`);
            } catch (err: any) {
                if (!err.message.includes("Duplicate column name")) {
                    console.warn(`[Repair] Error adding ${col.name} to projectContent:`, err.message, err.cause || "");
                }
            }
        }

        // 3. Repair modelConfigs table
        const modelConfigsColumns = [
            { name: "name", type: "varchar(255)" },
            { name: "description", type: "text" },
            { name: "costPerUnit", type: "decimal(10, 4) DEFAULT '0.0000'" }
        ];

        for (const col of modelConfigsColumns) {
            try {
                // First check if column exists to be extra safe
                await db.execute(sql.raw(`ALTER TABLE \`modelConfigs\` ADD COLUMN \`${col.name}\` ${col.type}`));
                console.log(`[Repair] Added column ${col.name} to modelConfigs`);
            } catch (err: any) {
                if (!err.message.includes("Duplicate column name")) {
                    console.warn(`[Repair] Error adding ${col.name} to modelConfigs:`, err.message, err.cause || "");
                }
            }
        }

        console.log("[Repair] Schema verification complete.");
    } catch (err: any) {
        console.error("[Repair] Global schema repair failure:", err.message);
    }
}
