import sharp from "sharp";
import axios from "axios";
import { ensurePermanentUrl } from "./aiGeneration";

/**
 * Crops a specific tile from a 3x4 Storyboard Grid image.
 * Returns the URL of the cropped tile in GCS.
 */
export async function cropGridTile(
    gridImageUrl: string,
    row: number, // 1-indexed
    col: number, // 1-indexed
    projectId: number
): Promise<string> {
    try {
        console.log(`[Image Processing] Cropping Row ${row}, Col ${col} from ${gridImageUrl}`);
        
        // Fetch original grid
        const response = await axios.get(gridImageUrl, { responseType: 'arraybuffer' });
        const gridBuffer = Buffer.from(response.data, 'binary');
        
        const metadata = await sharp(gridBuffer).metadata();
        if (!metadata.width || !metadata.height) throw new Error("Could not read image metadata");
        
        const tileWidth = Math.floor(metadata.width / 3);
        const tileHeight = Math.floor(metadata.height / 4);
        
        const left = (col - 1) * tileWidth;
        const top = (row - 1) * tileHeight;
        
        // Ensure crop is within bounds
        const safeWidth = Math.min(tileWidth, metadata.width - left);
        const safeHeight = Math.min(tileHeight, metadata.height - top);
        
        const cropBuffer = await sharp(gridBuffer)
            .extract({ left, top, width: safeWidth, height: safeHeight })
            .toBuffer();
        
        // Upload cropped version to GCS
        const cropName = `grid_crop_${projectId}_${row}_${col}.png`;
        return await ensurePermanentUrl(cropBuffer, "crops");
    } catch (error: any) {
        console.error("[Image Processing] cropGridTile failed:", error.message);
        throw error;
    }
}
