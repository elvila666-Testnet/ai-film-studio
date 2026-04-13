/**
 * Prompt Engineer Service — "The Translator"
 * Consumes the Showrunner's Production Bible and builds
 * executable AI prompts using the 6-Point Master Formula.
 */

import type { ProductionBible } from "./showrunnerService";

// ─── Types ──────────────────────────────────────────────────
interface ShotWithScene {
    order: number;
    visualDescription: string;
    cameraAngle: string;
    movement: string;
    lighting: string;
    lens: string;
    audioDescription: string;
    sceneTitle: string;
}

/**
 * Build a storyboard grid prompt for a SINGLE PAGE of 12 frames.
 * The caller is responsible for slicing 12 shots and passing them.
 */
export function buildStoryboardGridPrompt(
    bible: ProductionBible,
    pageShots?: ShotWithScene[],
    pageNumber?: number
): string {
    // ── CHARACTER ANCHORS ──
    const lockedCharacters = bible.characters.filter(
        (c) => c.imageUrl !== "draft"
    );

    // ── FRAME DESCRIPTIONS ──
    let gridShots: ShotWithScene[];

    if (pageShots && pageShots.length > 0) {
        // Use the provided page shots (already sliced to 12)
        gridShots = pageShots.slice(0, 12);
    } else {
        // Legacy fallback: flatten all shots from bible
        const allShots = bible.technicalScript.flatMap((scene) =>
            scene.shots.map((shot) => ({
                ...shot,
                sceneTitle: scene.title,
            }))
        );
        gridShots = allShots.slice(0, 12);
    }

    // Pad to exactly 12 frames
    while (gridShots.length < 12) {
        gridShots.push({
            order: gridShots.length + 1,
            visualDescription: "Continuation of the story",
            cameraAngle: "Medium Shot",
            movement: "Static",
            lighting: "Natural",
            lens: "50mm",
            audioDescription: "Ambient",
            sceneTitle: "Continuation",
        });
    }

    // Build VERY compact per-frame descriptions
    const frameLines = gridShots
        .map((shot, idx) => {
            return `Frame ${idx + 1}: ${shot.visualDescription}. ${shot.cameraAngle}, ${shot.lighting}, ${shot.lens}.`;
        })
        .join("\n");

    // ── CHARACTER DESCRIPTIONS ──
    const charDescriptions = bible.characters
        .map((c) => `${c.name}: ${c.description}`)
        .join("; ");

    const pageLabel = pageNumber ? ` (Page ${pageNumber})` : "";

    // ── ASSEMBLE FINAL PROMPT ──
    const prompt = `STORYBOARD CONTACT SHEET${pageLabel}. 
LAYOUT: A clean and organized 3-column by 4-row grid of 12 separate cinematic panels. Each panel must follow a cinematic 16:9 aspect ratio.
STRUCTURE: 12 frames in total. Thin white spatial dividers between frames.

QUALITY: ${bible.cinematography.camera}, ${bible.cinematography.lenses}, ${bible.cinematography.resolution}. Photo-realistic.

CHARACTERS: ${charDescriptions || "As described per frame"}

FRAME-BY-FRAME DIRECTIVES:
${frameLines}

${lockedCharacters.length > 0 ? `VISUAL ANCHOR: Maintain identical consistency for ${lockedCharacters.map((c) => c.name).join(", ")} across all 12 panels.` : ""}

STYLE: Professional hand-drawn look storyboard style but photorealistic, consistent cinematic color grading. 
IMPORTANT: NO TEXT, NO LABELS, NO DIGITS inside the images. STRICT 3×4 GRID.`;

    console.log(
        `[Prompt Engineer] Built grid prompt${pageLabel}: ${gridShots.length} frames, ${lockedCharacters.length} locked chars`
    );

    return prompt;
}

/**
 * Get all shots flattened from the bible with scene context
 */
export function getAllShotsFromBible(bible: ProductionBible): ShotWithScene[] {
    return bible.technicalScript.flatMap((scene) =>
        scene.shots.map((shot) => ({
            ...shot,
            sceneTitle: scene.title,
        }))
    );
}
