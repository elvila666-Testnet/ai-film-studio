import { runDirectorAgent, DirectorOutput } from "./agents/pre-production/directorAgent";
import { runCinematographyAgent, CinematographyOutput } from "./agents/production/cinematographyAgent";
import { runProductionDesignAgent, ProductionDesignOutput } from "./agents/production/productionDesignAgent";
import { runSoundDesignAgent, SoundDesignOutput } from "./agents/production/soundDesignAgent";
import { runScriptSupervisorAgent, ScriptSupervisorOutput } from "./agents/pre-production/scriptSupervisorAgent";
import { runVfxSupervisorAgent, VFXSupervisorOutput } from "./agents/production/vfxSupervisorAgent";
import { runFinOpsAgent, FinOpsOutput } from "./agents/pre-production/finopsAgent";

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
}

/**
 * 0. SYSTEM OVERVIEW
 * The architecture is divided into 6 core functions (5 agents + orchestrator):
 * - DIRECTOR_AGENT
 * - CINEMATOGRAPHY_AGENT
 * - PRODUCTION_DESIGN_AGENT
 * - SOUND_DESIGN_AGENT
 * - SCRIPT_SUPERVISOR_AGENT
 */
export async function runCinemaExecutionPipeline(
    input: CinemaPipelineInput
): Promise<CinemaPipelineOutput> {
    console.log(`[CinemaOrchestrator] Starting pipeline for scene...`);
    const startTime = Date.now();

    let finalSystemPrompt = `You are the DIRECTOR_AGENT (Narrative & Technical Authority).
Your objective is to transform the scene script into a high-fidelity technical breakdown.

### MISSION: EXECUTION-READY SHOT LIST ###
1. SHOT COVERAGE: Generate a comprehensive shot list that sustains a high-gloss cinematic or commercial pace. Follow the natural narrative flow of the scene. Do not artificially limit or inflate shot count.
2. NARRATIVE CONTRAST: Explicitly highlight the visual contrast between the compressed, claustrophobic URBAN environment and the sweeping, raw, antagonistic ALPINE landscape.
3. TECHNICAL DEPTH: Every shot must define the visual/emotional architecture. No generic descriptions.
4. PRACTICAL LIGHTING: Prioritize natural/available light sources. NO artificial studio setups outdoors.
5. DEPARTMENT SYNC: Your notes will drive Cinematography (lenses/lighting/hex colors) and Production Design (sets/props/TNF gear).

Return JSON: { "sceneHeader": string, "emotionalObjective": string, "shots": [...] }
Each shot MUST include: 
- shotNumber
- visualDescription (Precise action, composition, and urban/alpine contrast markers)
- emotionalObjective (The 'why' behind the shot)
- escalationMap (How this shot builds on the previous)
- psychologicalIntent (Effect on the viewer)
- blockingGeometry (Spatial relationship)
- cinematographyNotes (Specific lens, movement, and lighting intent. E.g., '35mm, 1/50 shutter, 24fps, high-contrast natural light, primary hex #0B0C10')
- productionDesignNotes (Specific set/props/wardrobe. E.g., 'Soot-stained TNF Summit Series Jacket, alpine granite ledge, rose-gold carabiner #B76E79')
- audioNotes (Sound and music intent)
${input.scaleMode ? `\nScale Mode: ${input.scaleMode}` : ""}`;
    // Step 1: Director Agent runs first (Narrative Authority)
    console.log(`[CinemaOrchestrator] Running Director Agent...`);
    const directorStart = Date.now();
    const directorOutput = await runDirectorAgent(
        input.sceneScript,
        input.projectId,
        input.globalNotes,
        input.scaleMode,
        finalSystemPrompt // Pass the refined prompt
    );
    console.log(`[CinemaOrchestrator] Director Agent completed in ${Date.now() - directorStart}ms`);

    // Step 2: Technical/Visual Departments run in parallel based on Director's output
    console.log(`[CinemaOrchestrator] Running Cinematography, Production Design, Sound, and VFX agents...`);
    const parallelStart = Date.now();
    let [cinematographyOutput, productionDesignOutput, soundDesignOutput, vfxOutput] = await Promise.all([
        runCinematographyAgent(directorOutput, input.projectId, input.globalNotes, input.cineRefinementNotes),
        runProductionDesignAgent(directorOutput, input.projectId, input.globalNotes, input.pdRefinementNotes),
        runSoundDesignAgent(directorOutput, input.projectId, input.globalNotes, input.scaleMode),
        runVfxSupervisorAgent(directorOutput, input.projectId, input.globalNotes)
    ]);
    console.log(`[CinemaOrchestrator] Parallel departments completed in ${Date.now() - parallelStart}ms`);

    // Step 2.5: Conflict Detection (VFX vs Director/Cine)
    const requiresGreenScreen = vfxOutput.shots.some(s => s.requiresGreenScreen);
    if (requiresGreenScreen) {
        console.log(`[CinemaOrchestrator] VFX Agent suggested a Green Screen. Checking against Director intent...`);
        // Director/Brand directives take precedence. 
        // We no longer force recalibration with green screen overrides unless requested by Director.
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
