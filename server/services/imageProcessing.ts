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
        
        // NEW: Add a slight inset to remove grid lines and borders
        const insetX = 8; 
        const insetY = 8;
        
        const left = (col - 1) * tileWidth + insetX;
        const top = (row - 1) * tileHeight + insetY;
        const width = tileWidth - (insetX * 2);
        const height = tileHeight - (insetY * 2);
        
        console.log(`[Image Processing] Extracting: Left=${left}, Top=${top}, Width=${width}, Height=${height} (Inset applied)`);

        const cropBuffer = await sharp(gridBuffer)
            .extract({ left, top, width, height })
            .toBuffer();
        
        // Upload cropped version to GCS
        return await ensurePermanentUrl(cropBuffer, "crops");
    } catch (error: any) {
        console.error("[Image Processing] cropGridTile failed:", error.message);
        throw error;
    }
}

/**
 * Overlays panel numbers (1-12, 13-24, etc.) on a 3x4 storyboard grid.
 */
export async function burnPanelNumbers(
    imageBuffer: Buffer,
    pageNumber: number // 1-indexed
): Promise<Buffer> {
    try {
        const metadata = await sharp(imageBuffer).metadata();
        if (!metadata.width || !metadata.height) throw new Error("Invalid image metadata");

        const tileWidth = metadata.width / 3;
        const tileHeight = metadata.height / 4;
        const startNum = (pageNumber - 1) * 12 + 1;

        let svgParts = `<svg width="${metadata.width}" height="${metadata.height}">`;
        
        for (let i = 0; i < 12; i++) {
            const rowIdx = Math.floor(i / 3);
            const colIdx = (rowIdx === 1) ? 2 - (i % 3) : (i % 3);
            
            const x = colIdx * tileWidth + 15; 
            const y = rowIdx * tileHeight + 45; 
            const num = startNum + i;

            // Burn in the panel number with a high-contrast style
            svgParts += `
                <text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="white" stroke="black" stroke-width="2">
                    #${num}
                </text>`;
        }
        
        svgParts += '</svg>';

        return await sharp(imageBuffer)
            .composite([{
                input: Buffer.from(svgParts),
                top: 0,
                left: 0
            }])
            .toBuffer();
    } catch (error: any) {
        console.error("[Image Processing] burnPanelNumbers failed:", error.message);
        return imageBuffer; // Fallback to original if burn fails
    }
}
