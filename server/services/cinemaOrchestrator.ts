import { runDirectorAgent, DirectorOutput, DirectorTechnicalScript } from "./agents/pre-production/directorAgent";
import { runCinematographyAgent, CinematographyOutput } from "./agents/production/cinematographyAgent";
import { runProductionDesignAgent, ProductionDesignOutput } from "./agents/production/productionDesignAgent";
import { runSoundDesignAgent, SoundDesignOutput } from "./agents/production/soundDesignAgent";
import { runScriptSupervisorAgent, ScriptSupervisorOutput } from "./agents/pre-production/scriptSupervisorAgent";
import { runVfxSupervisorAgent, VFXSupervisorOutput } from "./agents/production/vfxSupervisorAgent";
import { runFinOpsAgent, FinOpsOutput } from "./agents/pre-production/finopsAgent";
import {
    DirectorBrief,
    buildBriefFromTechnicalScript,
    buildBriefFromDirectorOutput,
    serializeBriefForDepartment,
} from "./agents/directorBrief";

export interface CinemaPipelineOutput extends ScriptSupervisorOutput {
    finOpsEstimates: FinOpsOutput;
    vfxStrategy: VFXSupervisorOutput;
    // Include individual outputs for debugging/UI
    director: DirectorOutput;
    cinematography: CinematographyOutput;
    productionDesign: ProductionDesignOutput;
    soundDesign: SoundDesignOutput;
}

export interface CinemaPipelineInput {
    sceneScript: string;
    projectId?: number;
    globalNotes?: string;
    scaleMode?: string;
    cineRefinementNotes?: string;
    pdRefinementNotes?: string;
    /** Pre-computed technical script from breakdownScript (preferred path) */
    technicalScript?: DirectorTechnicalScript;
    /** Brand DNA context to inject into all agent prompts */
    brandDNA?: string;
}

/**
 * CINEMA EXECUTION PIPELINE
 * 
 * Architecture: 5 agents + orchestrator
 * - DIRECTOR_AGENT (or pre-stored DirectorTechnicalScript)
 * - CINEMATOGRAPHY_AGENT
 * - PRODUCTION_DESIGN_AGENT
 * - SOUND_DESIGN_AGENT
 * - SCRIPT_SUPERVISOR_AGENT
 * - VFX_SUPERVISOR_AGENT
 * - FINOPS_AGENT
 * 
 * KEY ALIGNMENT MECHANISM:
 * When a DirectorTechnicalScript is available (from the breakdownScript step),
 * we build a structured DirectorBrief and pass department-specific requirements
 * directly to each agent. This ensures all agents are aligned from the start.
 */
export async function runCinemaExecutionPipeline(
    input: CinemaPipelineInput
): Promise<CinemaPipelineOutput> {
    console.log(`[CinemaOrchestrator] Starting pipeline for scene...`);
    const startTime = Date.now();

    let directorOutput: DirectorOutput;
    let brief: DirectorBrief;

    // ─── ALIGNMENT PATH: Use stored DirectorTechnicalScript if available ─────
    if (input.technicalScript) {
        console.log(`[CinemaOrchestrator] Using stored DirectorTechnicalScript brief (aligned path)`);
        
        // Build the structured brief from the rich technical script
        brief = buildBriefFromTechnicalScript(
            input.technicalScript,
            input.brandDNA,
            input.globalNotes
        );

        // Construct a DirectorOutput from the technical script for backward compatibility
        const allShots = input.technicalScript.scenes.flatMap(s => s.shots);
        directorOutput = {
            sceneHeader: input.technicalScript.projectTitle,
            emotionalObjective: input.technicalScript.emotionalArc,
            shots: allShots,
        };
    } else {
        // ─── FALLBACK PATH: Run Director Agent from scratch ─────────────────
        console.log(`[CinemaOrchestrator] No stored technical script. Running Director Agent from scratch...`);
        const directorStart = Date.now();

        const systemPrompt = `You are the DIRECTOR_AGENT (Narrative & Technical Authority).
Your objective is to transform the scene script into a high-fidelity technical breakdown.

### MISSION: EXECUTION-READY SHOT LIST ###
1. SHOT COVERAGE: Generate a comprehensive shot list that sustains a high-gloss cinematic or commercial pace. Follow the natural narrative flow of the scene.
2. NARRATIVE CONTRAST: Explicitly highlight the visual contrasts within the script's environments.
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
- productionDesignNotes (Specific set/props/wardrobe for the scene context)
- audioNotes (Sound and music intent)
${input.scaleMode ? `\nScale Mode: ${input.scaleMode}` : ""}`;

        directorOutput = await runDirectorAgent(
            input.sceneScript,
            input.projectId,
            input.globalNotes,
            input.scaleMode,
            systemPrompt
        );
        console.log(`[CinemaOrchestrator] Director Agent completed in ${Date.now() - directorStart}ms`);

        // Build brief from the simpler output
        brief = buildBriefFromDirectorOutput(directorOutput, input.brandDNA, input.globalNotes);
    }

    // ─── Log brief summary for debugging ────────────────────────────────────
    console.log(`[CinemaOrchestrator] DirectorBrief built: ${brief.perShotDirectives.length} shot directives, ` +
        `cine reqs: ${brief.cinematographyRequirements.length > 0 ? 'YES' : 'NO'}, ` +
        `PD reqs: ${brief.productionDesignRequirements.length > 0 ? 'YES' : 'NO'}`);

    // ─── Step 2: Run departments in parallel with structured brief context ──
    console.log(`[CinemaOrchestrator] Running Cinematography, Production Design, Sound, and VFX agents with DirectorBrief...`);
    const parallelStart = Date.now();

    // Serialize department-specific briefs for injection into agent prompts
    const cineBrief = serializeBriefForDepartment(brief, "cinematography");
    const pdBrief = serializeBriefForDepartment(brief, "productionDesign");
    const soundBrief = serializeBriefForDepartment(brief, "sound");

    let [cinematographyOutput, productionDesignOutput, soundDesignOutput, vfxOutput] = await Promise.all([
        runCinematographyAgent(directorOutput, input.projectId, cineBrief, input.cineRefinementNotes),
        runProductionDesignAgent(directorOutput, input.projectId, pdBrief, input.pdRefinementNotes),
        runSoundDesignAgent(directorOutput, input.projectId, soundBrief, input.scaleMode),
        runVfxSupervisorAgent(directorOutput, input.projectId, input.globalNotes)
    ]);
    console.log(`[CinemaOrchestrator] Parallel departments completed in ${Date.now() - parallelStart}ms`);

    // Step 2.5: Conflict Detection (VFX vs Director/Cine)
    const requiresGreenScreen = vfxOutput.shots.some(s => s.requiresGreenScreen);
    if (requiresGreenScreen) {
        console.log(`[CinemaOrchestrator] VFX Agent suggested a Green Screen. Checking against Director intent...`);
    }

    // Step 3: FinOps Agent runs on top of Production Design to estimate costs
    console.log(`[CinemaOrchestrator] Running FinOps Agent for budget estimation...`);
    const finOpsStart = Date.now();
    const finOpsOutput = await runFinOpsAgent(input.sceneScript, productionDesignOutput);
    console.log(`[CinemaOrchestrator] FinOps Agent completed in ${Date.now() - finOpsStart}ms`);

    // Step 4: Script Supervisor acts as final validation pass
    console.log(`[CinemaOrchestrator] Running Script Supervisor Agent for final validation...`);
    const supervisorStart = Date.now();
    const finalBlueprint = await runScriptSupervisorAgent(
        directorOutput,
        cinematographyOutput,
        productionDesignOutput,
        soundDesignOutput,
        input.globalNotes
    );
    console.log(`[CinemaOrchestrator] Script Supervisor Agent completed in ${Date.now() - supervisorStart}ms`);

    console.log(`[CinemaOrchestrator] Pipeline complete in ${Date.now() - startTime}ms`);
    return {
        ...finalBlueprint,
        finOpsEstimates: finOpsOutput,
        vfxStrategy: vfxOutput,
        director: directorOutput,
        cinematography: cinematographyOutput,
        productionDesign: productionDesignOutput,
        soundDesign: soundDesignOutput
    };
}
