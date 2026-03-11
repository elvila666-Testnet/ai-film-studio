import { getDb, getProjectContent } from "../../../db";
import { projectContent, shots, scenes } from "../../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export interface StoryboardFramePrompt {
    frameNumber: number;    // 1-12
    cameraAngle: string;
    action: string;
    characterRefs: string[]; // GCS URLs for character references
    moodboardRefs: string[]; // GCS URLs for mood board references
}

export interface GridPrompt {
    pageNumber: number;
    masterPrompt: string;              // The full Generic Storyboard Prompt ready for Nanobanana
    frames: StoryboardFramePrompt[];   // Individual frame specs for reference
    characterReferenceUrls: string[];  // All character refs to inject as image inputs
}

/**
 * PROMPT ENGINEER AGENT
 * Consolidates Director shot list + character portraits + PD/Cine mood boards
 * into ready-to-send Generic Storyboard Prompts for the Storyboard Agent.
 */
export async function buildStoryboardPrompts(
    projectId: number
): Promise<GridPrompt[]> {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

    const content = await getProjectContent(projectId);
    if (!content?.technicalScriptStatus || content.technicalScriptStatus !== "approved") {
        throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Technical script must be approved before Prompt Engineer can build storyboard prompts."
        });
    }

    // 1. Verify triple-validation from departments
    if (!content?.castingValidated || !content?.cineValidated || !content?.pdValidated) {
        throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "All departments (Casting, Cinematography, Production Design) must be validated by the Director before building prompts."
        });
    }

    // 2. Parse validated outputs
    const castingData = JSON.parse(content.castingApprovedOutput || "{}");
    const cineData = JSON.parse(content.cineApprovedOutput || "{}");
    const pdData = JSON.parse(content.pdApprovedOutput || "{}");

    const characterReferenceUrls = castingData.characterUrls || [];
    const moodboardReferenceUrls = [
        ...(cineData.moodboardUrls || []),
        ...(pdData.moodboardUrls || []),
        ...(cineData.referenceUrls || []),
        ...(pdData.referenceUrls || [])
    ].filter(Boolean);

    const cineSpecs = cineData.specs || "Standard cinematic lighting and camera work.";
    const pdSpecs = pdData.specs || "Standard production design as per brief.";

    // 3. Get all scene/shot data
    const sceneList = await db.select().from(scenes).where(eq(scenes.projectId, projectId)).orderBy(scenes.order);
    const allShots: Array<{
        shotNumber: number;
        cameraAngle: string;
        visualDescription: string;
        cinematographyNotes?: string;
        productionDesignNotes?: string;
    }> = [];

    let globalShotNumber = 1;
    for (const scene of sceneList) {
        const shotList = await db.select().from(shots).where(eq(shots.sceneId, scene.id)).orderBy(shots.order);
        for (const shot of shotList) {
            const blueprint = shot.aiBlueprint as Record<string, unknown> | null;
            allShots.push({
                shotNumber: globalShotNumber++,
                cameraAngle: shot.cameraAngle ?? "Medium Shot",
                visualDescription: shot.visualDescription ?? "",
                cinematographyNotes: blueprint?.cameraSpecs
                    ? JSON.stringify(blueprint.cameraSpecs)
                    : undefined,
                productionDesignNotes: blueprint?.productionDesign
                    ? JSON.stringify(blueprint.productionDesign)
                    : undefined,
            });
        }
    }

    if (allShots.length === 0) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No shots found. Run Director breakdown and scene breakdown first."
        });
    }

    // 4. Build prompts, 12 frames per grid page
    const FRAMES_PER_PAGE = 12;
    const totalPages = Math.ceil(allShots.length / FRAMES_PER_PAGE);
    const gridPrompts: GridPrompt[] = [];

    const visualStyle = content.visualStyle ?? "Cinematic";
    const projectTitle = content.brief?.substring(0, 60) ?? "Production";

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const pageNumber = pageIdx + 1;
        const pageShots = allShots.slice(pageIdx * FRAMES_PER_PAGE, (pageIdx + 1) * FRAMES_PER_PAGE);

        // Build frame specs
        const frames: StoryboardFramePrompt[] = pageShots.map((s, i) => ({
            frameNumber: i + 1,
            cameraAngle: s.cameraAngle,
            action: s.visualDescription,
            characterRefs: characterReferenceUrls,
            moodboardRefs: moodboardReferenceUrls,
        }));

        // Assemble Generic Storyboard Prompt
        let masterPrompt = `[System/Framework Instructions] Create a 3 columns by 4 rows grid (12 panels total), where each panel represents a 16:9 ratio, rendered in a 16:9 overall canvas. Preserve the exact character identity and environment from the reference images. `;
        masterPrompt += `Maintain a consistent ${visualStyle} cinematic style across all 12 panels.\n\n`;

        masterPrompt += `[Cinematography Specs]\n${cineSpecs}\n\n`;
        masterPrompt += `[Production Design Specs]\n${pdSpecs}\n\n`;

        if (content.technicalScript) {
            masterPrompt += `[Technical Script Summary]\n${content.technicalScript}\n\n`;
        }

        masterPrompt += `[Panel-by-Panel Descriptions]\n`;

        frames.forEach((f) => {
            masterPrompt += `Frame ${f.frameNumber}: [${f.cameraAngle}] - [${f.action}]\n`;
        });

        masterPrompt += `\nOutput the final image as a single 16:9 aspect ratio storyboard sheet. Technical Style: ${visualStyle}. Project: ${projectTitle}`;

        gridPrompts.push({
            pageNumber,
            masterPrompt,
            frames,
            characterReferenceUrls: [...characterReferenceUrls, ...moodboardReferenceUrls],
        });
    }

    // 4. Save to DB
    await db.update(projectContent)
        .set({ storyboardPrompts: JSON.stringify(gridPrompts) })
        .where(eq(projectContent.projectId, projectId));

    console.log(`[PromptEngineerAgent] Built ${gridPrompts.length} grid prompts for project ${projectId}`);
    return gridPrompts;
}

/**
 * Retrieve pre-built prompts from DB. Returns null if none have been built.
 */
export async function getBuiltPrompts(projectId: number): Promise<GridPrompt[] | null> {
    const content = await getProjectContent(projectId);
    if (!content?.storyboardPrompts) return null;
    try {
        return JSON.parse(content.storyboardPrompts) as GridPrompt[];
    } catch {
        return null;
    }
}
