import { invokeLLM } from "../../../_core/llm";

export interface StoryboardFramePrompt {
    frameNumber: number;
    shotId: number;
    cameraAngle: string;
    action: string;
    characterRefs: string[];
    moodboardRefs: string[];
    motionPrompt: string;
}

export interface SynthesisParams {
    projectTitle: string;
    visualStyle: string;
    cineSpecs: string;
    pdSpecs: string;
    brandDNA: string;
    frames: StoryboardFramePrompt[];
    storyIntent: string;
    visualContinuityRules: string;
    visualIdentityAnchor: string;
    pageIndex: number;
    totalPages: number;
    brief: string;
    synopsis: string;
    globalInstructions?: string;
}

/**
 * Use Gemini 1.5 Pro to synthesize a highly contextual master prompt for the storyboard grid.
 */
export async function synthesizeMasterPrompt(params: SynthesisParams): Promise<string> {
    const systemPrompt = `You are a world-class Storyboard Artist and Visual Prompt Engineer for "Nanobanana 2.0".
Your specialty is taking high-level film production documents (Briefs, Synopses, Casting, Production Design) and synthesizing them into a MASTER PROMPT for a 3×4 Storyboard Grid.

MISSION:
Create a single, highly descriptive prompt that will guide a state-of-the-art image generator (Flux/Nanobanana) to render a 12-panel grid where EACH panel corresponds to the opening moment of a specific shot.

CORE PRINCIPLES:
1. PROJECT DNA: You must weave the project's brief and synopsis into the foundational style.
2. VISUAL CONTINUITY: You must ensure characters and sets are described as coherent, persistent entities.
3. STORY ARC: The grid must feel like a sequence from the actual movie, not random shots.
4. DIRECTORIAL CONTROL: If global instructions are provided, they take absolute priority.`;

    const userMessage = `
# PROJECT DATA
**Title:** ${params.projectTitle}
**Brief:** ${params.brief}
**Synopsis:** ${params.synopsis}
**Master Visual Style:** ${params.visualStyle}
**Brand DNA:** ${params.brandDNA}

# DEPARTMENT SPECS
**Cinematography:** ${params.cineSpecs}
**Production Design:** ${params.pdSpecs}
**Visual Continuity Rules:** ${params.visualContinuityRules}
**Character Anchors:** ${params.visualIdentityAnchor}

# DIRECTOR'S GLOBAL INSTRUCTIONS
${params.globalInstructions || "None provided. Use your best creative judgment based on the brief."}

# STORYBOARD SPECIFICATION (Page ${params.pageIndex + 1} of ${params.totalPages})
${params.storyIntent}

# FRAME-BY-FRAME DESCRIPTIONS (3×4 GRID)
${params.frames.map(f => `### Frame ${f.frameNumber} (Shot ID: ${f.shotId})
- Action: ${f.action}
- Framing: ${f.cameraAngle}
`).join("\n")}

---
TASK: 
Synthesize all the above into a MASTER PROMPT. 
- Use the Nanobanana 2.0 structure.
- Explicitly demand a "3 columns and 4 rows" grid layout.
- Ensure the prompt is rich, photographic, and cinematic.
- DO NOT return JSON. Return the final prompt ONLY as a raw string.
`;

    console.log(`[Prompt Synthesis] 🤖 Synthesizing Master Prompt for Page ${params.pageIndex + 1}...`);
    
    if (params.frames.length === 0) {
        throw new Error("Cannot synthesize master prompt with zero frames.");
    }

    try {
        const result = await invokeLLM({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            model: "gemini-1.5-pro"
        });

        const synthesizedPrompt = result.choices[0].message.content as string;
        
        if (!synthesizedPrompt.toLowerCase().includes("3x4") && !synthesizedPrompt.toLowerCase().includes("3 columns") && !synthesizedPrompt.toLowerCase().includes("grid")) {
            console.warn("[Prompt Synthesis] LLM ignored grid layout requirement. Appending manually.");
            return synthesizedPrompt + "\n\n### MANDATORY GRID LAYOUT\n- Single 16:9 image containing a 3x4 grid (3 columns, 4 rows).";
        }

        return synthesizedPrompt;
    } catch (error) {
        console.error("[Prompt Synthesis] LLM call failed, falling back to template helper:", error);
        return buildFallbackMasterPrompt(params);
    }
}

/**
 * Fallback template-based prompt builder if Gemini is unavailable
 */
export function buildFallbackMasterPrompt(params: SynthesisParams): string {
    const pageHeader = params.pageIndex > 0 ? `
> ⚠️ **CROSS-PAGE CONTINUITY MANDATE (Page ${params.pageIndex + 1} of ${params.totalPages})**
> Maintain EXACT consistency with previous pages.
---
` : "";

    return `
# NANOBANANA 2.0 - STORYBOARD GRID (FALLBACK)
## Project: ${params.projectTitle}
${pageHeader}

## PROJECT CONTEXT
**Brief:** ${params.brief}
**Synopsis:** ${params.synopsis}
${params.globalInstructions ? `**INSTRUCTIONS:** ${params.globalInstructions}` : ""}

## ROLE
You are a cinematographer creating a 3×4 storyboard grid.

## SPECS
- Visual Style: ${params.visualStyle}
- Cinematic Specs: ${params.cineSpecs}
- Production Design: ${params.pdSpecs}
- Character Anchor: ${params.visualIdentityAnchor}

## SHOT-BY-SHOT FRAME DESCRIPTIONS
${params.frames.map(f => `### Frame ${f.frameNumber} (Shot ${f.frameNumber})
**Opening Moment:** ${f.action}
**Framing:** ${f.cameraAngle}
`).join("\n")}

### Image Output
- Single 16:9 aspect ratio image
- 3×4 grid layout (3 columns and 4 rows, 12 panels total)
- Thin white borders separating frames
- Hyper-realistic photographic style
- Cinematic lighting and high detail
`;
}
