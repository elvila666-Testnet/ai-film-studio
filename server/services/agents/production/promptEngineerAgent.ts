import { shots, scenes } from "../../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb, getProjectContent } from "../../../db";
import { getLockedCharacters } from "../../../db/characters";
import { 
    synthesizeMasterPrompt, 
    StoryboardFramePrompt, 
    buildFallbackMasterPrompt 
} from "./promptSynthesis";

export interface GridPrompt {
    pageNumber: number;
    masterPrompt: string;
    frames: StoryboardFramePrompt[];
    characterReferenceUrls: string[];
    storyIntent: string;
    visualContinuityRules: string;
}

/**
 * Fetch already built prompts from the database.
 */
export async function getBuiltPrompts(projectId: number): Promise<GridPrompt[] | null> {
    const db = await getDb();
    if (!db) return null;
    
    const content = await getProjectContent(projectId);
    if (!content?.storyboardPrompts) return null;
    
    try {
        const raw = typeof content.storyboardPrompts === "string" 
            ? content.storyboardPrompts 
            : JSON.stringify(content.storyboardPrompts);
        return JSON.parse(raw) as GridPrompt[];
    } catch (e) {
        console.error("[PromptEngineer] Failed to parse storyboard prompts:", e);
        return null;
    }
}

/**
 * PROMPT ENGINEER AGENT - Nanobanana 2.0 Edition
 * Orchestrates the creation of storyboard grid prompts using Gemini 1.5 Pro synthesis.
 */
export async function buildStoryboardPrompts(
    projectId: number,
    overrideVisualStyle?: string,
    globalInstructions?: string
): Promise<GridPrompt[]> {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

    const content = await getProjectContent(projectId);
    if (!content?.technicalScriptStatus || content.technicalScriptStatus !== "approved") {
        throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Technical script must be approved before building storyboards."
        });
    }

    // 1. Verify triple-validation from departments
    if (!content?.castingValidated || !content?.cineValidated || !content?.pdValidated) {
        throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Casting, Cinematography, and Production Design must be validated by the Director."
        });
    }

    const castingData = JSON.parse(content.castingApprovedOutput || "{}");
    const cineData = JSON.parse(content.cineApprovedOutput || "{}");
    const pdData = JSON.parse(content.pdApprovedOutput || "{}");

    // 1.5 Gather all high-fidelity image anchors for the grid
    const lockedChars = await getLockedCharacters(projectId);
    const approvedChars = lockedChars.filter((c: any) => c.imageUrl && c.imageUrl !== "draft");
    const approvedSets = (pdData.referenceUrls || []).filter(Boolean);

    const characterReferenceUrls = [
        ...(castingData.characterUrls || []),
        ...approvedChars.map((c: any) => c.imageUrl),
    ].filter(Boolean);

    const moodboardReferenceUrls = [
        ...(cineData.moodboardUrls || []),
        ...(pdData.moodboardUrls || []),
        ...(cineData.referenceUrls || []),
        ...approvedSets
    ].filter(Boolean);

    const cineSpecs = cineData.specs || "Standard cinematic lighting.";
    const pdSpecs = pdData.specs || "Standard production design.";
    const brandDNA = content.brandDNA || "Professional, cinematic.";

    // 2. Build Visual Identity Anchor from Locked Characters (Textual)
    const visualIdentityAnchor = lockedChars
        .map((c: any) => `CHARACTER "${c.name}": ${c.description}.`)
        .join("\n");

    // 3. Collect ALL shots for the project
    const sceneList = await db.select().from(scenes).where(eq(scenes.projectId, projectId)).orderBy(scenes.order);
    const allShots: Array<{ shotId: number; shotNumber: number; cameraAngle: string; visualDescription: string }> = [];

    let globalShotNumber = 1;
    for (const scene of sceneList) {
        const shotList = await db.select().from(shots).where(eq(shots.sceneId, scene.id)).orderBy(shots.order);
        for (const shot of shotList) {
            allShots.push({
                shotId: shot.id,
                shotNumber: globalShotNumber++,
                cameraAngle: shot.cameraAngle ?? "Medium Shot",
                visualDescription: shot.visualDescription ?? "",
            });
        }
    }

    if (allShots.length === 0) {
        throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "No shots found in project. Please ensure scenes have been approved and the Cinema Pipeline has been run to generate shot blueprints." 
        });
    }

    // 4. Group into 3x4 Grid Pages (12 shots per page)
    const FRAMES_PER_PAGE = 12;
    const totalPages = Math.ceil(allShots.length / FRAMES_PER_PAGE);
    const gridPrompts: GridPrompt[] = [];

    const visualStyle = overrideVisualStyle ?? content.visualStyle ?? "Cinematic";
    const brief = content.brief || "";
    const synopsis = content.synopsis || "";
    const projectTitle = brief.substring(0, 60) || "Production";

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const pageNumber = pageIdx + 1;
        const pageShots = allShots.slice(pageIdx * FRAMES_PER_PAGE, (pageIdx + 1) * FRAMES_PER_PAGE);

        const frames: StoryboardFramePrompt[] = pageShots.map((s, i) => ({
            frameNumber: i + 1,
            shotId: s.shotId,
            cameraAngle: s.cameraAngle,
            action: s.visualDescription,
            characterRefs: characterReferenceUrls,
            moodboardRefs: moodboardReferenceUrls,
            motionPrompt: `Shot ${s.shotNumber}: Opening moment. ${s.visualDescription}. Camera: ${s.cameraAngle}.`,
        }));

        const storyIntent = `Establishing visual narrative for project ${projectTitle}, Page ${pageNumber}.`;
        const visualContinuityRules = `Character/Set consistency based on: ${cineSpecs}, ${pdSpecs}.`;

        // 5. Synthesize Master Prompt using Gemini 1.5 Pro
        let masterPrompt = "";
        try {
            masterPrompt = await synthesizeMasterPrompt({
                projectTitle,
                visualStyle,
                cineSpecs,
                pdSpecs,
                brandDNA,
                frames,
                storyIntent,
                visualContinuityRules,
                visualIdentityAnchor,
                pageIndex: pageIdx,
                totalPages,
                brief,
                synopsis,
                globalInstructions
            });
        } catch (err) {
            console.error("[PromptEngineer] LLM Synthesis failed, falling back to template:", err);
            masterPrompt = buildFallbackMasterPrompt({
                projectTitle, visualStyle, cineSpecs, pdSpecs, brandDNA,
                frames, storyIntent, visualContinuityRules, visualIdentityAnchor,
                pageIndex: pageIdx, totalPages, brief, synopsis, globalInstructions
            });
        }

        gridPrompts.push({
            pageNumber,
            masterPrompt,
            frames,
            characterReferenceUrls: [...characterReferenceUrls, ...moodboardReferenceUrls],
            storyIntent,
            visualContinuityRules
        });
    }

    return gridPrompts;
}
