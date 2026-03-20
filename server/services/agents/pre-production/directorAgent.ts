import { invokeLLM } from "../../../_core/llm";
import { getDb, getProjectContent } from "../../../db";
import { projectContent, scenes, shots } from "../../../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { parseAgentJSON } from "../_agentUtils";

// ─── Output Interfaces ──────────────────────────────────────────────────────

export interface DirectorShot {
    shotNumber: number;
    visualDescription: string;
    emotionalObjective: string;
    escalationMap: string;
    psychologicalIntent: string;
    blockingGeometry: string;
    // Department requirements from technical breakdown
    cameraAngle?: string;
    movement?: string;
    lighting?: string;
    lens?: string;
    cinematographyNotes?: string;   // Lens/movement intent
    productionDesignNotes?: string; // Set/props/atmosphere intent
    audioNotes?: string;            // Sound intent
    castingRequirements?: string;   // Characters needed + descriptions
}

export interface TechnicalScene {
    sceneNumber: number;
    heading: string;
    description: string;
    shots: DirectorShot[];
}

export interface DirectorTechnicalScript {
    projectTitle: string;
    overallTone: string;
    emotionalArc: string;
    scenes: TechnicalScene[];
    castingRequirements: string;              // High-level cast summary (normalized string)
    cinematographyRequirements: string;       // High-level camera style (normalized string)
    productionDesignRequirements: string;     // High-level PD style (normalized string)
}

/**
 * Normalizes complex fields that might be accidentally returned as objects by the LLM.
 * React Error #31 occurs when these are rendered as children.
 */
function normalizeToString(val: any): string {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") {
        return Object.entries(val)
            .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
            .join("\n");
    }
    return String(val);
}

function normalizeTechnicalScript(script: DirectorTechnicalScript): DirectorTechnicalScript {
    script.castingRequirements = normalizeToString(script.castingRequirements);
    script.cinematographyRequirements = normalizeToString(script.cinematographyRequirements);
    script.productionDesignRequirements = normalizeToString(script.productionDesignRequirements);

    if (script.scenes) {
        for (const scene of script.scenes) {
            if (scene.shots) {
                for (const shot of scene.shots) {
                    shot.castingRequirements = normalizeToString(shot.castingRequirements);
                    shot.cinematographyNotes = normalizeToString(shot.cinematographyNotes);
                    shot.productionDesignNotes = normalizeToString(shot.productionDesignNotes);
                }
            }
        }
    }
    return script;
}

export interface DirectorValidationResult {
    approved: boolean;
    feedback: string;
    revisedOutput?: string; // Optional revised version from Director
}

export interface DeviationCheckResult {
    hasDeviations: boolean;
    reasoning: string;
}

// ─── Core Agent Functions ────────────────────────────────────────────────────

/**
 * DIRECTOR AGENT — Narrative & Technical Authority
 * Receives an approved script + Brand DNA and generates a full technical script
 * with shot-level emotional maps and department requirement summaries.
 */
export async function breakdownScript(
    projectId: number,
    script: string,
    brandDNA?: string,
    globalNotes?: string
): Promise<DirectorTechnicalScript> {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

    // Guard: Script must be approved first
    const content = await getProjectContent(projectId);
    if (content?.scriptStatus !== "approved") {
        throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Script must be approved before Director can generate the technical breakdown."
        });
    }

    const systemPrompt = [
        `You are the DIRECTOR_AGENT — the Narrative and Technical Authority of this production.`,
        `Your objective is to transform an approved script into a detailed technical script.`,
        `This technical script will be read by Casting, Cinematography, and Production Design departments.`,
        ``,
        `OUTPUT RESPONSIBILITIES:`,
        `- projectTitle: Name of the project`,
        `- overallTone: The cinematic tone (e.g., "gritty noir", "warm commercial")`,
        `- emotionalArc: The emotional journey across the whole piece`,
        `- castingRequirements: HIGH-FIDELITY PERSONNEL LIST. MUST reflect exact personnel specs as a SCALAR STRING (no nested objects). Include: 
            1. Principal Leads: Detailed physical/emotional constraints (athletic, deep focus, NO overt emoting). 
            2. Specialized Action Models: Stunt athletes, and Hand/Foot models for product close-ups.
            3. Background Extras: Definite energy constraint (lethargic, spiritless demeanor) for local contrast.`,
        `- cinematographyRequirements: High-level summary of the visual language (lens style, movement philosophy). MUST BE A STRING.`,
        `- productionDesignRequirements: HIGH-FIDELITY SET & PROP LIST. MUST reflect exact physical specs as a SCALAR STRING. Include:
            1. Unique Sets: Define the architectural soul, materials, and atmospheric weight based on the director's guidelines.
            2. Hero Props: Identify items with narrative criticality.
            3. Textural Logic: Enforce specific material contrasts if outlined in the director's notes.
            4. Color Palette Policy: STRICT ENFORCEMENT of the director's vision. This palette is the absolute law for all props, sets, and wardrobe.`,
        `- scenes: Array of scenes, each containing:`,
        `    - sceneNumber, heading, description`,
        `    - shots array: Generate a comprehensive shot list that fully covers the narrative beats and emotional requirements of the scene. Do not artificially limit or inflate the shot count; let the action dictate the coverage.`,
        `    - Each shot contains:`,
        `        - shotNumber, visualDescription, emotionalObjective, escalationMap`,
        `        - psychologicalIntent, blockingGeometry`,
        `        - cameraAngle, movement, lighting, lens`,
        `        - castingRequirements (MUST BE A STRING)`,
        `        - cinematographyNotes (MUST BE A STRING)`,
        `        - productionDesignNotes (MUST BE A STRING: specify set/props/wardrobe. MANDATE the inclusion of specific hero props based on the scene and global notes.)`,
        `        - audioNotes (sound intent for this shot)`,
        ``,
        `RULES:`,
        `- Escalate tension, scale, or intimacy progressively through shots.`,
        `- Be specific with blocking geometry (where characters stand relative to camera).`,
        `- Return ONLY valid JSON matching the schema above.`,
        brandDNA ? `\nBrand DNA:\n${brandDNA}` : "",
        globalNotes ? `\nDirector Notes:\n${globalNotes}` : "",
    ].filter(Boolean).join("\n");

    const response = await invokeLLM({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Break down the following script into a technical director's script:\n\n${script}` }
        ],
        response_format: { type: "json_object" }
    });

    const raw = response.choices[0]?.message.content;
    if (!raw) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Director Agent failed to produce output" });

    const rawStr = typeof raw === "string" ? raw : JSON.stringify(raw);
    let technicalScript = parseAgentJSON<DirectorTechnicalScript>(
        rawStr,
        "DirectorAgent.breakdownScript",
        null as unknown as DirectorTechnicalScript
    );

    if (technicalScript) {
        technicalScript = normalizeTechnicalScript(technicalScript);
    }
    if (!technicalScript || !technicalScript.scenes) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Director Agent returned invalid JSON structure" });
    }

    // ─── Phase 2: Relational Sync (Populate scenes and shots tables) ────────────────
    try {
        // Clear existing breakdown to avoid duplicates
        const existingScenes = await db.select().from(scenes).where(eq(scenes.projectId, projectId));
        if (existingScenes.length > 0) {
            const sceneIds = existingScenes.map((s: { id: number }) => s.id);
            await db.delete(shots).where(inArray(shots.sceneId, sceneIds));
            await db.delete(scenes).where(eq(scenes.projectId, projectId));
        }

        // Insert new scenes and shots
        for (const scene of technicalScript.scenes) {
            const [insertedScene] = await db.insert(scenes).values({
                projectId,
                order: scene.sceneNumber,
                title: scene.heading,
                description: scene.description,
                status: "draft"
            }).$returningId();

            if (insertedScene && scene.shots) {
                for (const shot of scene.shots) {
                    await db.insert(shots).values({
                        sceneId: insertedScene.id,
                        order: shot.shotNumber,
                        visualDescription: shot.visualDescription,
                        cameraAngle: shot.cameraAngle || shot.cinematographyNotes || "Medium Shot",
                        movement: shot.movement || "Static",
                        lighting: shot.lighting || "Cinematic",
                        lens: shot.lens || "35mm",
                        audioDescription: shot.audioNotes || "Ambient",
                        aiBlueprint: shot,
                        status: "planned"
                    });
                }
            }
        }
        console.log(`[DirectorAgent] Relational tables synced: ${technicalScript.scenes.length} scenes inserted.`);
    } catch (dbErr) {
        console.error("[DirectorAgent] Failed to sync relational tables:", dbErr);
        // We don't throw here to ensure technicalShots JSON is still returned/saved
    }

    // Save to DB and mark as pending_review
    await db.update(projectContent)
        .set({
            technicalShots: JSON.stringify(technicalScript),
            technicalScriptStatus: "pending_review"
        })
        .where(eq(projectContent.projectId, projectId));

    console.log(`[DirectorAgent] Technical script generated for project ${projectId}. ${technicalScript.scenes?.length ?? 0} scenes.`);
    return technicalScript;
}

/**
 * Stateless validation: Director reviews a department's output against original requirements.
 * Re-injects the original requirements + agent output each call.
 * If approved, persists the results to DB for the Prompt Engineer.
 */
export async function validateDepartmentReturn(
    projectId: number,
    agentName: "Casting" | "Cinematography" | "ProductionDesign",
    originalRequirements: string,
    agentOutput: string,
    approvedData?: any, // JSON blob containing validated specs/URLs
    globalNotes?: string
): Promise<DirectorValidationResult> {
    const response = await invokeLLM({
        messages: [
            {
                role: "system",
                content: `You are the DIRECTOR_AGENT. Review the output from the ${agentName} department.
Validate that it:
1. Meets the original requirements (EXHAUSTIVE check for Hero Props, Wardrobe, and Textural details).
2. Is consistent with the emotional arc and tone.
3. Has no technical contradictions.
4. FOR PRODUCTION DESIGN: Strictly verify the use of the required color palette and materials as defined in the director's notes or the original requirements.

Return JSON: { "approved": boolean, "feedback": string, "revisedOutput": string | null }
If not approved, provide specific actionable feedback. If approved, revisedOutput can be null.
${globalNotes ? `\nDirector Notes:\n${globalNotes}` : ""}`
            },
            {
                role: "user",
                content: `ORIGINAL REQUIREMENTS:\n${originalRequirements}\n\n${agentName.toUpperCase()} OUTPUT:\n${agentOutput}\n\nValidate and return JSON.`
            }
        ],
        response_format: { type: "json_object" }
    });

    const raw = response.choices[0]?.message.content;
    const validation = parseAgentJSON<DirectorValidationResult>(
        raw,
        `DirectorAgent.validate${agentName}`,
        { approved: false, feedback: "Director Agent failed to produce valid validation JSON. Please retry." }
    );

    // Persist to DB if approved
    if (validation.approved && projectId) {
        const db = await getDb();
        if (db) {
            const updateObj: any = {};
            if (agentName === "Casting") {
                updateObj.castingValidated = true;
                updateObj.castingApprovedOutput = JSON.stringify(approvedData || { agentOutput });
            } else if (agentName === "Cinematography") {
                updateObj.cineValidated = true;
                updateObj.cineApprovedOutput = JSON.stringify(approvedData || { agentOutput });
            } else if (agentName === "ProductionDesign") {
                updateObj.pdValidated = true;
                updateObj.pdApprovedOutput = JSON.stringify(approvedData || { agentOutput });
            }

            await db.update(projectContent)
                .set(updateObj)
                .where(eq(projectContent.projectId, projectId));

            console.log(`[DirectorAgent] ${agentName} validation PERSISTED for project ${projectId}`);
        }
    }

    return validation;
}

/**
 * Lightweight stateless check: Quickly determine if a department output deviates from the brief/requirements.
 * Used to skip heavy Director validation if the agent nailed it on the first try.
 */
export async function checkDepartmentDeviations(
    agentName: "Casting" | "Cinematography" | "ProductionDesign",
    originalRequirements: string,
    agentOutput: string,
    brief?: string
): Promise<DeviationCheckResult> {
    const response = await invokeLLM({
        messages: [
            {
                role: "system",
                content: `You are the LEAD CREATIVE AUDITOR.
Your only job is to do a rapid, strict check: Does the ${agentName} output DEVIATE from the original requirements or the project brief?
A deviation includes:
- Missing required elements (e.g., missed a specific prop, cast member, or visual style).
- Contradicting the brief (e.g., adding upbeat colors to a noir brief).
- Failing to follow strict constraints defined in the requirements.

If the output fulfills the requirements accurately without contradicting the brief, return hasDeviations: false.
If there are contradictions or missed requirements, return hasDeviations: true.

Return JSON ONLY: { "hasDeviations": boolean, "reasoning": string }
Keep 'reasoning' concise (1-2 sentences).`
            },
            {
                role: "user",
                content: `PROJECT BRIEF:\n${brief || "No brief provided."}\n\nORIGINAL REQUIREMENTS:\n${originalRequirements}\n\n${agentName.toUpperCase()} OUTPUT:\n${agentOutput}\n\nCheck for deviations and return JSON.`
            }
        ],
        response_format: { type: "json_object" }
    });

    const raw = response.choices[0]?.message.content;
    const result = parseAgentJSON<DeviationCheckResult>(
        raw,
        `DirectorAgent.checkDeviations_${agentName}`,
        { hasDeviations: true, reasoning: "Fallback: failed to parse deviation check, assuming deviations exist for safety." }
    );

    return result;
}

/**
 * Approve the technical script. Marks it ready for Casting/Cinematography/PD departments.
 */
export async function approveTechnicalScript(projectId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

    const content = await getProjectContent(projectId);
    if (!content?.technicalShots) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No technical script to approve. Run breakdown first." });
    }

    await db.update(projectContent)
        .set({ technicalScriptStatus: "approved" })
        .where(eq(projectContent.projectId, projectId));

    console.log(`[DirectorAgent] Technical script approved for project ${projectId}. Departments can now receive their requirements.`);
}

/**
 * Get the Director's requirements for a specific department from the stored technical script.
 */
export async function getDepartmentRequirements(
    projectId: number,
    department: "casting" | "cinematography" | "productionDesign"
): Promise<string> {
    const content = await getProjectContent(projectId);
    if (!content?.technicalShots) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No technical script found. Run Director breakdown first." });
    }

    const technical: DirectorTechnicalScript = JSON.parse(content.technicalShots);

    switch (department) {
        case "casting":
            return `${technical.castingRequirements}\n\nPer-shot casting notes:\n${technical.scenes.flatMap(s => s.shots).map(sh =>
                `Shot ${sh.shotNumber}: ${sh.castingRequirements || "N/A"}`
            ).join("\n")
                }`;
        case "cinematography":
            return `${technical.cinematographyRequirements}\n\nPer-shot camera notes:\n${technical.scenes.flatMap(s => s.shots).map(sh =>
                `Shot ${sh.shotNumber}: ${sh.cinematographyNotes || sh.visualDescription || "N/A"}`
            ).join("\n")
                }`;
        case "productionDesign":
            return `${technical.productionDesignRequirements}\n\nPer-shot PD notes:\n${technical.scenes.flatMap(s => s.shots).map(sh =>
                `Shot ${sh.shotNumber}: ${sh.productionDesignNotes || "N/A"}`
            ).join("\n")
                }`;
    }
}

// Re-exports for backward compatibility with cinemaOrchestrator
export interface DirectorOutput {
    sceneHeader: string;
    emotionalObjective: string;
    shots: DirectorShot[];
}

const DIRECTOR_OUTPUT_FALLBACK: DirectorOutput = {
    sceneHeader: "Scene Breakdown (Fallback Mode)",
    emotionalObjective: "Director Agent did not return output. Using standard narrative breakdown.",
    shots: []
};

export async function runDirectorAgent(
    sceneScript: string,
    projectId?: number,
    globalNotes?: string,
    scaleMode?: string,
    systemPrompt?: string
): Promise<DirectorOutput> {
    let finalSystemPrompt = systemPrompt || `You are the DIRECTOR_AGENT (Narrative & Technical Authority).
Your objective is to transform the scene script into a high-fidelity technical breakdown.

### MISSION: EXECUTION-READY SHOT LIST ###
1. SHOT COVERAGE: Generate a comprehensive shot list that sustains a high-gloss cinematic or commercial pace. Follow the natural narrative flow of the scene.
2. NARRATIVE CONTRAST: Explicitly highlight the visual contrasts between the script's environments.
3. TECHNICAL DEPTH: Every shot must define the visual/emotional architecture. No generic descriptions.
4. PRACTICAL LIGHTING: Prioritize natural/available light sources. NO artificial studio setups outdoors.
5. DEPARTMENT SYNC: Your per-shot notes will drive Cinematography (lenses/lighting/hex colors) and Production Design (sets/props/wardrobe).

Return JSON: { "sceneHeader": string, "emotionalObjective": string, "shots": [...] }
Each shot MUST include: 
- shotNumber
- visualDescription (Precise action, composition, and environmental contrast markers)
- emotionalObjective (The 'why' behind the shot)
- escalationMap (How this shot builds on the previous)
- psychologicalIntent (Effect on the viewer)
- blockingGeometry (Spatial relationship)
- cinematographyNotes (Specific lens, movement, and lighting intent. E.g., '35mm, 1/50 shutter, 24fps, high-contrast natural light, primary hex #0B0C10')
- productionDesignNotes (Specific set/props/wardrobe for the scene. E.g., 'Worn leather jacket, industrial concrete warehouse, brass compass #B76E79')
- audioNotes (Sound and music intent)
${scaleMode ? `\nScale Mode: ${scaleMode}` : ""}`;

    if (projectId) {
        try {
            const { injectBrandDirectives } = await import("../../../services/brandService");
            finalSystemPrompt = await injectBrandDirectives(projectId, finalSystemPrompt);
        } catch { /* brand injection optional */ }
    }

    const response = await invokeLLM({
        messages: [
            { role: "system", content: finalSystemPrompt },
            { role: "user", content: `Scene Script:\n${sceneScript}\n\nGlobal Notes:\n${globalNotes || "None"}` }
        ],
        response_format: { type: "json_object" }
    });

    const raw = response.choices[0]?.message.content;
    if (!raw) return DIRECTOR_OUTPUT_FALLBACK;
    const str = typeof raw === "string" ? raw : JSON.stringify(raw);
    const result = parseAgentJSON<DirectorOutput>(str, "DirectorAgent.runDirectorAgent", DIRECTOR_OUTPUT_FALLBACK);

    if (result && !Array.isArray(result.shots)) {
        result.shots = [];
    }

    return result;
}
