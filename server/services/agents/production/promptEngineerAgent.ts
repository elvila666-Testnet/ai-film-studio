import { projectContent, shots, scenes } from "../../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export interface StoryboardFramePrompt {
    frameNumber: number;    // 1-12
    cameraAngle: string;
    action: string;
    characterRefs: string[]; // GCS URLs for character references
    moodboardRefs: string[]; // GCS URLs for mood board references
    motionPrompt: string;   // 1-2 sentence description of what happens next
}

export interface GridPrompt {
    pageNumber: number;
    masterPrompt: string;              // The full Nanobanana 2.0 Storyboard Prompt
    frames: StoryboardFramePrompt[];   // Individual frame specs for reference
    characterReferenceUrls: string[];  // All character refs to inject as image inputs
    storyIntent: string;               // Emotional/narrative arc
    visualContinuityRules: string;     // Strict continuity constraints
}

/**
 * PROMPT ENGINEER AGENT - Nanobanana 2.0 Edition
 * 
 * Consolidates Director shot list + character portraits + PD/Cine mood boards
 * into award-winning cinematographic storyboard prompts for the Storyboard Agent.
 * 
 * Features:
 * - 3×4 grid (12 frames) with 4-beat story structure
 * - Hyper-realistic photographic style
 * - Strict visual continuity rules
 * - Motion prompts for each frame
 * - Image-to-Image reference integration
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

    // 4. Build prompts, 12 frames per grid page (3×4)
    const FRAMES_PER_PAGE = 12;
    const totalPages = Math.ceil(allShots.length / FRAMES_PER_PAGE);
    const gridPrompts: GridPrompt[] = [];

    const visualStyle = overrideVisualStyle ?? content.visualStyle ?? "Cinematic";
    const projectTitle = content.brief?.substring(0, 60) ?? "Production";

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const pageNumber = pageIdx + 1;
        const pageShots = allShots.slice(pageIdx * FRAMES_PER_PAGE, (pageIdx + 1) * FRAMES_PER_PAGE);

        // Build frame specs with motion prompts
        const frames: StoryboardFramePrompt[] = pageShots.map((s, i) => ({
            frameNumber: i + 1,
            cameraAngle: s.cameraAngle,
            action: s.visualDescription,
            characterRefs: characterReferenceUrls,
            moodboardRefs: moodboardReferenceUrls,
            motionPrompt: generateMotionPrompt(i + 1, s.visualDescription, s.cameraAngle),
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

        // Assemble Enhanced Nanobanana 2.0 Storyboard Prompt
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

    console.log(`[PromptEngineer] Built ${gridPrompts.length} storyboard prompt page(s) for project ${projectId}`);
    return gridPrompts;
}

/**
 * Generate a motion prompt for each frame (1-2 sentences)
 * Describes what happens NEXT, as if the frame is the first moment of a video clip
 */
function generateMotionPrompt(frameNumber: number, action: string, cameraAngle: string): string {
    const storyBeats = {
        1: "Opening moment establishing the scene and protagonist.",
        2: "Introduction of the environment and context.",
        3: "First hint of conflict or tension.",
        4: "Rising action begins, stakes increase.",
        5: "Tension escalates with dynamic movement.",
        6: "Climactic moment of highest intensity.",
        7: "Peak action or emotional crescendo.",
        8: "Turning point toward resolution.",
        9: "Transition to resolution phase.",
        10: "Resolution unfolds with clarity.",
        11: "Emotional payoff and closure.",
        12: "Final frame leaving lasting impression.",
    };

    const beat = storyBeats[frameNumber as keyof typeof storyBeats] || "Narrative moment unfolds.";
    return `${beat} ${action}. Camera: ${cameraAngle}.`;
}

/**
 * Generate story intent based on narrative arc
 */
function generateStoryIntent(projectTitle: string, frames: StoryboardFramePrompt[]): string {
    return `
Project: ${projectTitle}

Story Structure (12 frames):
- Frames 1-3 (Setup): Establish character, environment, and context
- Frames 4-8 (Rising Tension & Climax): Build tension, escalate action, reach peak moment
- Frames 9-12 (Resolution): Resolve conflict, provide emotional payoff, conclude narrative

Emotional Arc: Progression from introduction → tension → climax → resolution
Visual Arc: Smooth camera movement and framing variations across all 12 frames
Character Arc: Consistent identity, wardrobe, and emotional state throughout
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
### Strict Visual Continuity Rules (3×4 Grid - 12 Frames)

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
`;
}

/**
 * Build the master prompt for Nanobanana 2.0
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
# NANOBANANA 2.0 - CINEMATOGRAPHIC STORYBOARD PROMPT
## Project: ${projectTitle}

---

## ROLE & CONTEXT
You are an award-winning trailer director, cinematographer, and visual storyteller with expertise in:
- Cinematic storyboarding and shot composition
- Character consistency and visual continuity
- Professional color grading and lighting
- High-fidelity image-to-image generation

---

## TASK
Generate a 3×4 storyboard grid (12 frames total) that tells a cohesive cinematic story.
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

## PANEL-BY-PANEL FRAME DESCRIPTIONS

`;

    frames.forEach((f) => {
        prompt += `
### Frame ${f.frameNumber} (${f.cameraAngle})
**Action:** ${f.action}
**Motion Prompt:** ${f.motionPrompt}
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

### Text Output (Motion Prompts)
For each of the 12 frames, provide a 1-2 sentence motion prompt describing what happens next, as if the frame is the first moment of a video clip that is about to play.

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
Generate the storyboard now. Ensure all 12 frames tell a cohesive story with perfect visual continuity, professional cinematography, and award-winning visual composition.
`;

    return prompt;
}
