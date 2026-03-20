import { invokeLLM } from "../../../_core/llm";
import { DirectorOutput } from "../pre-production/directorAgent";
import { parseAgentJSON } from "../_agentUtils";
import { injectBrandDirectives } from "../../../services/brandService";

export interface CinematographyShot {
    shotNumber: number;
    shotType: string;
    cameraBody: string;
    sensorFormat: string;
    lensStrategy: string;
    tStop: string;
    focusStrategy: string;
    movementLogic: string;
    lightingSpec: string;
}

export interface CinematographyOutput {
    generalStyle: string;
    overarchingTechnicalDirectives: string;
    shots: CinematographyShot[];
}

const CINEMATOGRAPHY_FALLBACK: CinematographyOutput = {
    generalStyle: "Standard cinematic style",
    overarchingTechnicalDirectives: "Cinematography agent did not return output. Using standard cinematic defaults.",
    shots: []
};

/**
 * CINEMATOGRAPHY AGENT
 * Role: Visual Physics Authority
 * Task: Appends technical camera and lighting specs to the Director's shots.
 */
export async function runCinematographyAgent(
    directorOutput: DirectorOutput,
    projectId?: number,
    globalNotes?: string,
    refinementNotes?: string
): Promise<CinematographyOutput> {
    try {
        let systemPrompt = `You are the CINEMATOGRAPHY_AGENT (AI Virtual Production Authority).
Your objective is to take the Director's shot list and translate it into precise AI Prompts for Image and Video Generation models (e.g. Midjourney, Flux, Sora).

### DIRECTOR'S BRIEF ALIGNMENT ###
You will receive structured per-shot directives from the Director below. These contain SPECIFIC camera/lens/movement/lighting requirements per shot.
You MUST incorporate these directives faithfully. Your role is to EXPAND and ENRICH the Director's camera notes — not to contradict or ignore them.
If the Director specifies a lens, use that lens. If the Director specifies a lighting style, match it. Add technical depth on top.

### CRITICAL CONSTRAINTS ###
1. VIRTUAL PRODUCTION OPTIMIZATION: Do not list physical gear limitations (e.g. "No HMI lights"). Instead, use AI-native lighting descriptors (e.g., "Volumetric god rays, hyper-realistic ambient occlusion, cinematic high contrast").
2. NO HARDCODING: Do not assume a specific brand or environment unless it is provided in the Brand DNA or Director's Brief.
3. TECHNICAL PRECISION: Define the specific rendering aesthetic (e.g., 'Shot on 35mm Prime, photorealistic 8k, anamorphic flare').
${refinementNotes ? `\n### REFINEMENT INSTRUCTIONS ###\nThe Director has provided the following feedback on your previous output. You MUST strictly incorporate these changes while maintaining the core vision:\n${refinementNotes}\n` : ""}

OUTPUT RESPONSIBILITIES:
- generalStyle: High-level visual language (e.g. 'Handheld kinetic', 'Static brutalist').
- overarchingTechnicalDirectives: The 'AI Rendering Bible' for the scene.
- shots: Array of shots matching the Director's structure, adding:
    - shotType
    - renderingStyle (e.g. 'Photorealistic', 'Cinematic 3D', 'Anime')
    - lensStrategy (e.g. 'Wide angle 14mm', 'Macro detail')
    - lightingSpec (Detailing the natural or synthetic light direction and grade intent in prompt format)
    - movementLogic (e.g. 'Sora prompt: FPV drone sweeping forward', 'Static tripod')

RULES:
- Maintain visual physics.
- Respect the brand palette if provided.
- Every shot in your output MUST correspond to a shot from the Director's list.
- Return a JSON object matching the CinematographyOutput interface.`;

        if (projectId) {
            systemPrompt = await injectBrandDirectives(projectId, systemPrompt);
        }

        const response = await invokeLLM({
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: `Director Output:\n${JSON.stringify(directorOutput, null, 2)}\n\nGlobal Notes:\n${globalNotes || 'None'}`
                }
            ],
            response_format: { type: "json_object" }
        });

        const raw = response.choices[0]?.message.content;
        return parseAgentJSON<CinematographyOutput>(raw, "CinematographyAgent", CINEMATOGRAPHY_FALLBACK);
    } catch (err) {
        console.error("[CinematographyAgent] LLM call failed:", err);
        return CINEMATOGRAPHY_FALLBACK;
    }
}
