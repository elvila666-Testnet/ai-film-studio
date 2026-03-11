import { invokeLLM } from "../../../_core/llm";
import { DirectorOutput } from "../pre-production/directorAgent";
import { parseAgentJSON } from "../_agentUtils";
import { injectBrandDirectives } from "../../../services/brandService";

export interface VFXShotStatus {
    shotNumber: number;
    requiresVFX: boolean;
    vfxElements: string[];
    complexity: "None" | "Low" | "Medium" | "High";
    requiresGreenScreen: boolean;
    technicalRequirements: string[];
}

export interface VFXSupervisorOutput {
    generalVFXStrategy: string;
    shots: VFXShotStatus[];
}

const VFX_FALLBACK: VFXSupervisorOutput = {
    generalVFXStrategy: "No VFX requirements identified — practical production assumed.",
    shots: []
};

/**
 * VFX SUPERVISOR AGENT
 * Role: Post & Simulation Authority
 * Task: Analyzes the Director's shot list to identify CGI, green screen, and tracking requirements.
 */
export async function runVfxSupervisorAgent(
    directorOutput: DirectorOutput,
    projectId?: number,
    globalNotes?: string
): Promise<VFXSupervisorOutput> {
    try {
        let systemPrompt = `You are the VFX_SUPERVISOR_AGENT (Post & Simulation Authority).
Your objective is to analyze the Director's shot list and define all post-production visual effects requirements.

OUTPUT RESPONSIBILITIES (PER SHOT): 
- requiresVFX: boolean
- vfxElements: Array of specific effects (e.g., "Muzzle flash", "CGI backdrop", "Wire removal")
- complexity: None, Low, Medium, or High
- requiresGreenScreen: boolean (CRITICAL: flag this if the background needs replacement or heavy compositing)
- technicalRequirements: Requirements for the set (e.g., "Tracking markers on wall", "Clean plate needed")

RULES:
- Be highly scrutinized. Do not add VFX if practical effects or real locations are sufficient.
- If the environment or action is physically impossible or highly dangerous, flag requiresGreenScreen = true and high complexity.

Return a JSON object containing a generalVFXStrategy string and an array of shots with the aforementioned properties.`;

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
        return parseAgentJSON<VFXSupervisorOutput>(raw, "VFXSupervisorAgent", VFX_FALLBACK);
    } catch (err) {
        console.error("[VFXSupervisorAgent] LLM call failed:", err);
        return VFX_FALLBACK;
    }
}
