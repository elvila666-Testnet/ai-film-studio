import { projectContent, shots, scenes } from "../../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb, getProjectContent } from "../../../db";

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

export interface StoryboardFramePrompt {
    frameNumber: number;    // 1-12 (one per shot)
    shotId: number;         // Reference to the original shot
    cameraAngle: string;
    action: string;
    characterRefs: string[]; // GCS URLs for character references
    moodboardRefs: string[]; // GCS URLs for mood board references
    motionPrompt: string;   // Description of the first moment of this shot
}

export interface GridPrompt {
    pageNumber: number;
    masterPrompt: string;              // Prompt for generating 3×4 grid of first images
    frames: StoryboardFramePrompt[];   // Individual frame specs (1 per shot)
    characterReferenceUrls: string[];  // All character refs to inject as image inputs
    storyIntent: string;               // Emotional/narrative arc
    visualContinuityRules: string;     // Strict continuity constraints
}

/**
 * PROMPT ENGINEER AGENT - Nanobanana 2.0 Edition
 * 
 * Generates prompts for the FIRST IMAGE of each shot (3×4 grid = 12 shots)
 * Each frame represents the opening moment of a shot.
 * 
 * Shot Designer will later generate additional moments within each shot.
 */
export async function buildStoryboardPrompts(
    projectId: number,
    overrideVisualStyle?: string
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
    const brandDNA = content.brandDNA || "Professional, cinematic, high-impact.";

    // 3. Get all scene/shot data
    const sceneList = await db.select().from(scenes).where(eq(scenes.projectId, projectId)).orderBy(scenes.order);
    const allShots: Array<{
        shotId: number;
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
                shotId: shot.id,
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

    // 4. Build prompts, 12 frames per grid page (3×4)
    // Each frame = FIRST IMAGE of one shot
    const FRAMES_PER_PAGE = 12;
    const totalPages = Math.ceil(allShots.length / FRAMES_PER_PAGE);
    const gridPrompts: GridPrompt[] = [];

    const visualStyle = overrideVisualStyle ?? content.visualStyle ?? "Cinematic";
    const projectTitle = content.brief?.substring(0, 60) ?? "Production";

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const pageNumber = pageIdx + 1;
        const pageShots = allShots.slice(pageIdx * FRAMES_PER_PAGE, (pageIdx + 1) * FRAMES_PER_PAGE);

        // Build frame specs - ONE FRAME PER SHOT (first image only)
        const frames: StoryboardFramePrompt[] = pageShots.map((s, i) => ({
            frameNumber: i + 1,
            shotId: s.shotId,
            cameraAngle: s.cameraAngle,
            action: s.visualDescription,
            characterRefs: characterReferenceUrls,
            moodboardRefs: moodboardReferenceUrls,
            motionPrompt: generateFirstImagePrompt(i + 1, s.visualDescription, s.cameraAngle),
        }));

        // Generate story intent based on narrative arc
        const storyIntent = generateStoryIntent(projectTitle, frames);

        // Build visual continuity rules
        const visualContinuityRules = buildVisualContinuityRules(
            characterReferenceUrls,
            cineSpecs,
            pdSpecs,
            brandDNA
        );

        // Assemble Storyboard Prompt for 3×4 grid of FIRST IMAGES
        let masterPrompt = buildMasterPrompt(
            projectTitle,
            visualStyle,
            cineSpecs,
            pdSpecs,
            brandDNA,
            frames,
            storyIntent,
            visualContinuityRules
        );

        gridPrompts.push({
            pageNumber,
            masterPrompt,
            frames,
            characterReferenceUrls: [...characterReferenceUrls, ...moodboardReferenceUrls],
            storyIntent,
            visualContinuityRules,
        });
    }

    // 5. Save to DB
    await db.update(projectContent)
        .set({ storyboardPrompts: JSON.stringify(gridPrompts) })
        .where(eq(projectContent.projectId, projectId));

    console.log(`[PromptEngineer] Built ${gridPrompts.length} storyboard prompt page(s) with first images for project ${projectId}`);
    return gridPrompts;
}

/**
 * Generate a prompt for the FIRST IMAGE of a shot
 * This is the opening moment - what the viewer sees first
 */
function generateFirstImagePrompt(frameNumber: number, action: string, cameraAngle: string): string {
    return `Shot ${frameNumber}: The opening moment. ${action}. Camera: ${cameraAngle}.`;
}

/**
 * Generate story intent based on narrative arc
 */
function generateStoryIntent(projectTitle: string, frames: StoryboardFramePrompt[]): string {
    return `
Project: ${projectTitle}

Storyboard Structure (3×4 Grid = 12 First Images):
- Each frame represents the OPENING MOMENT of a shot
- Frames 1-3: Setup and introduction
- Frames 4-8: Rising action and development
- Frames 9-12: Climax and resolution

Each frame is the first image the viewer sees of that shot.
Shot Designer will later generate additional moments within each shot.
`;
}

/**
 * Build strict visual continuity rules
 */
function buildVisualContinuityRules(
    characterRefs: string[],
    cineSpecs: string,
    pdSpecs: string,
    brandDNA: string
): string {
    return `
### Strict Visual Continuity Rules (3×4 Grid - 12 First Images)

**Character Consistency:**
- Same main character appears in all frames with consistent facial features, skin tone, hair color/style
- Wardrobe remains consistent unless explicitly changing scenes
- Character emotions and energy flow naturally across frames

**Environment & Lighting:**
- Consistent environment tone, lighting style, time of day across all frames
- Maintain cinematic color palette and mood throughout
- Depth of field consistent with reference images

**Visual Style:**
- Hyper-realistic photographic style with cinematic lighting
- High detail and physically accurate textures and materials
- Professional color grading and visual effects

**Cinematography Specifications:**
${cineSpecs}

**Production Design Specifications:**
${pdSpecs}

**Brand DNA:**
${brandDNA}

**Framing Variety:**
- Naturally vary framing, distance, and viewpoint across 12 frames
- Avoid repeating the same composition
- Use different shot types (wide, medium, close-up, detail shots)
- Maintain smooth visual flow between frames

**Technical Requirements:**
- Output: Single 16:9 image showing 12 panels in a 3×4 grid
- Panels separated by thin white borders
- No caption or description overlays
- Each frame maintains 16:9 aspect ratio
- Each frame shows the FIRST/OPENING moment of that shot
`;
}

/**
 * Build the master prompt for Nanobanana 2.0 Storyboard
 */
function buildMasterPrompt(
    projectTitle: string,
    visualStyle: string,
    cineSpecs: string,
    pdSpecs: string,
    brandDNA: string,
    frames: StoryboardFramePrompt[],
    storyIntent: string,
    visualContinuityRules: string
): string {
    let prompt = `
# NANOBANANA 2.0 - STORYBOARD GRID (FIRST IMAGES)
## Project: ${projectTitle}

---

## ROLE & CONTEXT
You are an award-winning cinematographer and visual storyteller creating a storyboard grid.
Your task is to generate the OPENING MOMENT of each shot in a 3×4 grid layout.

---

## TASK
Generate a 3×4 storyboard grid (12 frames total) showing the FIRST IMAGE of each shot.
Each frame should be a 16:9 aspect ratio panel in a single unified 16:9 canvas.

---

## STORY INTENT
${storyIntent}

---

## VISUAL CONTINUITY RULES
${visualContinuityRules}

---

## CINEMATOGRAPHY SPECIFICATIONS
${cineSpecs}

---

## PRODUCTION DESIGN SPECIFICATIONS
${pdSpecs}

---

## BRAND DNA
${brandDNA}

---

## SHOT-BY-SHOT FRAME DESCRIPTIONS

`;

    frames.forEach((f) => {
        prompt += `
### Frame ${f.frameNumber} - Shot ${f.frameNumber} (${f.cameraAngle})
**Opening Moment:** ${f.action}
**First Image Description:** ${f.motionPrompt}
`;
    });

    prompt += `

---

## OUTPUT REQUIREMENTS

### Image Output
- Single 16:9 aspect ratio image
- 3×4 grid layout (12 panels total)
- Thin white borders separating frames
- Hyper-realistic photographic style
- Cinematic lighting and high detail
- Physically accurate textures and materials
- Professional color grading
- NO caption or description overlays
- EACH FRAME SHOWS THE OPENING MOMENT OF THAT SHOT

### Important Notes
- Frame 1 = Opening moment of Shot 1
- Frame 2 = Opening moment of Shot 2
- ... and so on
- These are the FIRST IMAGES viewers see of each shot
- Shot Designer will later generate additional moments within each shot

---

## QUALITY STANDARDS
- Maintain strict visual continuity across all 12 frames
- Ensure smooth camera movement and framing variations
- Keep character identity and wardrobe consistent
- Preserve environment tone and lighting style
- Deliver award-winning cinematographic quality
- Render in hyper-realistic photographic style
- Apply professional color grading

---

## FINAL INSTRUCTION
Generate the storyboard grid now. Each of the 12 frames should show the OPENING MOMENT of its respective shot, with perfect visual continuity, professional cinematography, and award-winning visual composition.
`;

    return prompt;
}
