import { invokeLLM } from "../../../_core/llm";
import { parseAgentJSON } from "../_agentUtils";

export interface CreativeDirectorOutput {
    commercialHook: string;
    keyVisuals: string[];
    brandTaglinePlacement: string;
    pacingLogic: string;
    narrativeArc: string;
    script: string;
}

const CREATIVE_FALLBACK: CreativeDirectorOutput = {
    commercialHook: "Visual Hook",
    keyVisuals: [],
    brandTaglinePlacement: "End card",
    pacingLogic: "Standard cinematic pacing",
    narrativeArc: "Introduction -> Conflict -> Brand Resolution",
    script: "Creative vision materialized from brand DNA."
};

/**
 * CREATIVE DIRECTOR AGENT
 * Role: Brand & Commercial Authority
 * Task: Translates Brand DNA and user brief into a high-impact commercial vision and script.
 */
export async function runCreativeDirectorAgent(
    brandDNA: string,
    userBrief: string,
    targetDuration: number,
    aspectRatio: string
): Promise<CreativeDirectorOutput> {
    const response = await invokeLLM({
        messages: [
            {
                role: "system",
                content: `You are the CREATIVE_DIRECTOR_AGENT (Brand & Commercial Authority).
Your specialization is translating abstract brand values and marketing objectives into high-impact, cinematic commercial spots.

CORE OBJECTIVES:
- Hook the audience within the first 3 seconds.
- Ensure brand voice and visual DNA are woven into the narrative, not just slapped on.
- Optimize the story for the specific duration and aspect ratio.

INPUT CONTEXT:
Brand DNA:
${brandDNA}

User Brief:
${userBrief}

TECHNICAL CONSTRAINTS:
Duration: ${targetDuration}s
Aspect Ratio: ${aspectRatio}

OUTPUT RESPONSIBILITIES:
- commercialHook: The primary attention-grabber.
- keyVisuals: List of high-fidelity visual metaphors or key frames.
- brandTaglinePlacement: Strategy for placing the brand message/logo.
- pacingLogic: Describe the editorial rhythm (e.g., "fast cuts", "slow tracking shots").
- narrativeArc: Brief 3-act flow.
- script: A descriptive script (including visuals and audio) that the Director Agent will use to build the shot list.

Return a JSON object conforming to these responsibilities.`
            },
            {
                role: "user",
                content: `Synthesize the creative vision for a ${targetDuration}s spot based on the brief: "${userBrief}"`
            }
        ],
        response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message.content;
    return parseAgentJSON<CreativeDirectorOutput>(content, "CreativeDirectorAgent", CREATIVE_FALLBACK);
}
