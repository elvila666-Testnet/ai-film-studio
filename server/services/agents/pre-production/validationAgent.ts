import { invokeLLM } from "../../../_core/llm";

export interface ValidationOutput {
    isValid: boolean;
    feedback: string;
}

/**
 * VALIDATION AGENT
 * Role: Acts as the Creative Director to validate inputs before proceeding.
 */

export async function validateBrief(
    brandDNA: string,
    userBrief: string
): Promise<ValidationOutput> {
    const response = await invokeLLM({
        messages: [
            {
                role: "system",
                content: `You are the CREATIVE_DIRECTOR_AGENT. Your task is to validate a proposed brief against the Brand DNA.
If the brief fundamentally contradicts the brand's core values or negative constraints, reject it. Otherwise, approve it and optionally provide constructive feedback for the Scriptwriter.
Respond strictly in JSON format with "isValid" (boolean) and "feedback" (string).`
            },
            {
                role: "user",
                content: `Brand DNA:\n${brandDNA}\n\nUser Brief:\n${userBrief}\n\nValidate this brief.`
            }
        ],
        response_format: { type: "json_object" }
    });

    try {
        const content = (response.choices[0]?.message.content as string) || "{}";
        return JSON.parse(content) as ValidationOutput;
    } catch {
        return { isValid: true, feedback: "Brief accepted automatically due to parsing error." };
    }
}
