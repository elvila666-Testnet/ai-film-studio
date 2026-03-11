import { invokeLLM } from "../../../_core/llm";
import { ProductionDesignOutput } from "../production/productionDesignAgent";
import { parseAgentJSON } from "../_agentUtils";

export interface CostBreakdownItem {
    department: "Sets/Locations" | "Cast/Extras" | "VFX" | "Equipment" | "Miscellaneous";
    item: string;
    estimatedCost: number;
    reasoning: string;
}

export interface FinOpsOutput {
    totalEstimatedCost: number;
    breakdown: CostBreakdownItem[];
    budgetRiskLevel: "Low" | "Medium" | "High" | "Critical";
    costSavingRecommendations: string[];
}

const FINOPS_FALLBACK: FinOpsOutput = {
    totalEstimatedCost: 0,
    breakdown: [],
    budgetRiskLevel: "Low",
    costSavingRecommendations: ["FinOps agent could not estimate costs for this scene. Run again or check server logs."]
};

/**
 * FINOPS AGENT
 * Role: Budget Estimation Authority
 * Task: Ingests the scene script and Production Design specs to calculate real-world budget estimates.
 * Note: This agent is NON-BLOCKING. If it fails, the pipeline returns fallback data rather than crashing.
 */
export async function runFinOpsAgent(
    sceneScript: string,
    productionDesignOutput: ProductionDesignOutput
): Promise<FinOpsOutput> {
    try {
        const response = await invokeLLM({
            messages: [
                {
                    role: "system",
                    content: `You are the FINOPS_AGENT (Budget Estimation Authority).
Your objective is to ingest the Scene Script and the Production Design specs and estimate the real-world production budget for this specific scene.

OUTPUT RESPONSIBILITIES:
- totalEstimatedCost: The total sum of all estimated costs for this scene (in USD).
- breakdown: An array of specific cost items (e.g., location permits, set builds, extra casting, CGI complexity). Provide a department, item name, estimated cost, and reasoning.
- budgetRiskLevel: Categorize the risk of going over budget based on the scene's complexity.
- costSavingRecommendations: A few actionable bullet points on how the director could reduce costs without sacrificing the core narrative.

Return a JSON object with the properties: totalEstimatedCost (number), breakdown (array of CostBreakdownItem), budgetRiskLevel (string), and costSavingRecommendations (array of strings).`
                },
                {
                    role: "user",
                    content: `Scene Script:\n${sceneScript}\n\nProduction Design Specs:\n${JSON.stringify(productionDesignOutput, null, 2)}`
                }
            ],
            response_format: { type: "json_object" }
        });

        const raw = response.choices[0]?.message.content;
        return parseAgentJSON<FinOpsOutput>(raw, "FinOpsAgent", FINOPS_FALLBACK);
    } catch (err) {
        console.error("[FinOpsAgent] LLM call failed:", err);
        return FINOPS_FALLBACK;
    }
}
