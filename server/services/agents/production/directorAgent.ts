import { invokeLLM } from "../../../_core/llm";
import { parseAgentJSON } from "../_agentUtils";

export interface CreativeProposalOutput {
    visionStatement: string;
    narrativeArc: string;
    pacingAndTone: string;
    visualStyle: string;
    targetAudience: string;
}

const FALLBACK_PROPOSAL: CreativeProposalOutput = {
    visionStatement: "A compelling visual narrative.",
    narrativeArc: "Beginning, Middle, End.",
    pacingAndTone: "Standard pacing.",
    visualStyle: "Cinematic, high contrast.",
    targetAudience: "General Audience",
};

/**
 * DIRECTOR AGENT
 * Role: Formulates a unified creative proposal from the approved script.
 */
export async function generateCreativeProposal(
    script: string,
    brandDNA: string,
    duration: number,
    aspectRatio: string
): Promise<CreativeProposalOutput> {
    const response = await invokeLLM({
        messages: [
            {
                role: "system",
                content: `You are the lead DIRECTOR_AGENT for an AI Film Studio.
Your task is to read the approved screenplay and formulate a High-Level Creative Proposal.
This proposal is the guiding light for all downstream departments (Casting, Production Design, Cinematography).

OUTPUT RESPONSIBILITIES:
- visionStatement: 1-2 sentences summarizing the directorial vision.
- narrativeArc: How the story flows visually.
- pacingAndTone: Edit speed, emotional tone, music pacing.
- visualStyle: The overarching visual aesthetic (e.g. "Neon Noir", "Bright Corporate").
- targetAudience: Who this appeals to.

Format as a JSON object.`
            },
            {
                role: "user",
                content: `Brand DNA:\n${brandDNA}\n\nApproved Script:\n${script}\n\nTechnical Constraints: ${duration} seconds, ${aspectRatio} aspect ratio.\n\nGenerate the Creative Proposal.`
            }
        ],
        response_format: { type: "json_object" }
    });

    const content = (response.choices[0]?.message.content as string) || "{}";
    return parseAgentJSON<CreativeProposalOutput>(content, "DirectorAgent", FALLBACK_PROPOSAL);
}
