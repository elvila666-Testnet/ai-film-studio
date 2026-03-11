import { ENV } from "../server/_core/env";
import { getDb } from "../server/db";
import { uploadBase64Image } from "../server/_core/gcs";
import { uploadExternalUrlToGCS } from "../server/services/storageService";
import { sql, eq } from "drizzle-orm";
import {
    projects, storyboardImages, referenceImages, characters,
    characterLibrary, moodboardImages, generations, brands, shots,
    editorClips, editorExports
} from "../drizzle/schema";

async function secureUrl(url: string, folder: string): Promise<string | null> {
    if (!url || typeof url !== 'string') return null;

    // 1. Handle Base64
    if (url.startsWith('data:image/') || url.startsWith('data:audio/') || url.startsWith('data:video/')) {
        return await uploadBase64Image(url, folder);
    }

    // 2. Handle External URLs (not in our bucket)
    if (url.startsWith('http') && ENV.gcsBucketName && !url.includes(`storage.googleapis.com/${ENV.gcsBucketName}`)) {
        console.log(`  Migrating external URL: ${url.substring(0, 50)}...`);
        try {
            const { url: newUrl } = await uploadExternalUrlToGCS(url, folder);
            return newUrl;
        } catch (e: any) {
            console.error(`  Migration Error: ${e.message}`);
            return null;
        }
    }

    return null;
}

async function backfillTable(tableName: string, tableObj: any, column: string, folder: string) {
    console.log(`\n--- Backfilling ${tableName}.${column} ---`);
    const db = await getDb();
    if (!db) return;

    const results = await db.select().from(tableObj);
    let count = 0;

    for (const row of results) {
        const url = (row as any)[column];
        const newUrl = await secureUrl(url, folder);

        if (newUrl) {
            console.log(`  Updating ${tableName} ID ${(row as any).id || (row as any).uuid}...`);
            await db.update(tableObj)
                .set({ [column]: newUrl })
                .where(eq((tableObj as any).id, (row as any).id));
            count++;
        }
    }
    console.log(`Finished ${tableName}. Total backfilled: ${count}`);
}

async function main() {
    console.log("Starting FINAL Asset Backfill (External/Base64 -> GCS)...");

    const tasks = [
        { table: 'projects', obj: projects, column: 'thumbnailUrl', folder: 'projects/thumbnails' },
        { table: 'storyboardImages', obj: storyboardImages, column: 'imageUrl', folder: 'storyboards' },
        { table: 'storyboardImages', obj: storyboardImages, column: 'masterImageUrl', folder: 'storyboards/hd' },
        { table: 'referenceImages', obj: referenceImages, column: 'imageUrl', folder: 'references' },
        { table: 'characters', obj: characters, column: 'imageUrl', folder: 'characters' },
        { table: 'characters', obj: characters, column: 'referenceImageUrl', folder: 'characters/references' },
        { table: 'characterLibrary', obj: characterLibrary, column: 'imageUrl', folder: 'library/characters' },
        { table: 'moodboardImages', obj: moodboardImages, column: 'imageUrl', folder: 'moodboards' },
        { table: 'generations', obj: generations, column: 'imageUrl', folder: 'generations' },
        { table: 'generations', obj: generations, column: 'masterImageUrl', folder: 'generations/hd' },
        { table: 'brands', obj: brands, column: 'logoUrl', folder: 'brands/logos' },
        { table: 'editorClips', obj: editorClips, column: 'fileUrl', folder: 'editor/clips' },
        { table: 'editorExports', obj: editorExports, column: 'exportUrl', folder: 'editor/exports' },
    ];

    for (const task of tasks) {
        await backfillTable(task.table, task.obj, task.column, task.folder);
    }

    console.log("\n--- BACKFILL COMPLETE ---");
    process.exit(0);
}

main().catch(err => {
    console.error("Backfill script failed:", err);
    process.exit(1);
});
