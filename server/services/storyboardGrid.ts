import { NANOBANANA_PRO_CRITERIA } from "./aiGeneration";

/**
 * Generate a 3x4 storyboard grid prompt
 */
export function generateStoryboardGridPrompt(
    shots: Array<{ shot: number; accion: string; intencion: string; tipo_plano: string }>,
    globalInstructions: string
): string {
    const framesDescription = shots
        .sort((a, b) => a.shot - b.shot)
        .slice(0, 12) // Ensure max 12 for 3x4
        .map((shot, index) => {
            return `FRAME ${index + 1}: [${shot.tipo_plano}] ${shot.accion}. Intent: ${shot.intencion}.`;
        })
        .join("\n");

    return `
3x4 storyboard grid
Each frame 16:9
8K HDR ultra photorealistic
Same characters across all frames
No character reinterpretation
No facial variation
No hairstyle change
No mustache thickness variation
No body proportion shift
No uniform redesign
No medal repositioning
🔒 HARD CHARACTER LOCK

NANOBANANA PRO CINEMATIC STYLE:
${NANOBANANA_PRO_CRITERIA}

GLOBAL INSTRUCTIONS:
${globalInstructions}

FRAME STRUCTURE:
${framesDescription}

MANDATORY:
Use exact face reconstruction from the locked character reference images. Do not alter facial structure.
Identity weight priority over lighting and composition. Preserve face accuracy at all costs.
`;
}
