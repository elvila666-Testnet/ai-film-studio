import 'dotenv/config';
import { getDb } from '../db';
import { storyboardImages } from '../../drizzle/schema';
import { like } from 'drizzle-orm';
import { uploadExternalUrlToGCS, uploadFileToGCS } from '../services/storageService';

async function main() {
    const db = await getDb();
    console.log('Fetching storyboard images with base64 data...');
    const base64Images = await db.select().from(storyboardImages).where(like(storyboardImages.imageUrl, 'data:image/%'));

    console.log(`Found ${base64Images.length} base64 images to backfill.`);

    for (const record of base64Images) {
        if (!record.imageUrl) continue;

        try {
            console.log(`Uploading base64 image for shot ${record.shotNumber}...`);
            const { url } = await uploadFileToGCS(record.imageUrl, 'image/jpeg', 'backfills');
            await db.update(storyboardImages).set({ imageUrl: url }).where(like(storyboardImages.id, record.id));
            console.log(`Success: Shot ${record.shotNumber} - ${url}`);
        } catch (e) {
            console.error(`Failed to upload to GCS for shot ${record.shotNumber}`, e);
        }
    }

    console.log('Fetching storyboard images with legacy built-in URLs or proxy URLs...');
    // Adjust this query if your previous proxy was hosted locally or mapped differently
    // Since we also want to catch old Replicate URLs if any are left
    const httpImages = await db.select().from(storyboardImages).where(like(storyboardImages.imageUrl, 'http%'));
    let legacyCount = 0;

    for (const record of httpImages) {
        if (!record.imageUrl) continue;
        if (record.imageUrl.includes('storage.googleapis.com')) continue; // Already in GCS

        try {
            console.log(`Migrating external URL ${record.imageUrl} for shot ${record.shotNumber}...`);
            const { url } = await uploadExternalUrlToGCS(record.imageUrl, 'backfills');
            await db.update(storyboardImages).set({ imageUrl: url }).where(like(storyboardImages.id, record.id));
            legacyCount++;
            console.log(`Success: Shot ${record.shotNumber} migrated to GCS - ${url}`);
        } catch (e) {
            console.error(`Failed to migrate proxy URL for shot ${record.shotNumber}`, e);
        }
    }

    console.log(`Migrated ${legacyCount} legacy external URLs.`);
    console.log('Backfill process complete!');
    process.exit(0);
}

main().catch(console.error);
