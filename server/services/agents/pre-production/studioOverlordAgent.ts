import { invokeLLM } from "../../../_core/llm";
import { getDb } from "../../../db";
import { usageLedger, projects, brands } from "../../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { parseAgentJSON } from "../_agentUtils";
import { TRPCError } from "@trpc/server";

export interface ConsistencyValidation {
    protectedParameters: string[];
    validatedAgainstDNA: boolean;
    dnaAlignmentScore: number; // 0-100
    conflictsDetected: string[];
    remedialInstructions?: string;
}

export interface OverlordOutput {
    consistencyValidation: ConsistencyValidation;
    negotiatedConstraints: {
        visual?: string;
        technical?: string;
        narrative?: string;
        casting?: string;
    };
    rigidityStatus: "ENFORCED" | "ADJUSTED" | "OVERRIDDEN";
    feedbackLoopStatus: "APPROVED" | "REJECTED" | "ADJUSTED";
}

/**
 * STUDIO ARCHITECTURE & CONSISTENCY OVERLORD
 * Role: Central Orchestrator Agent. Ensures Absolute Consistency.
 */

export async function runStudioOverlord(
    projectId: number,
    taskDescription: string,
    currentContext: any,
    rigidityScale: number = 70 // 0-100
): Promise<OverlordOutput> {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

    // 1. Fetch Project and Brand DNA
    const projectResult = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const project = projectResult[0];
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

    let brandDNA = "No Brand DNA configured.";
    if (project.brandId) {
        const brandResult = await db.select().from(brands).where(eq(brands.id, project.brandId)).limit(1);
        const brand = brandResult[0];
        if (brand) {
            brandDNA = `
NAME: ${brand.name}
AESTHETIC: ${brand.aesthetic || "N/A"}
MISSION: ${brand.mission || "N/A"}
VOICE: ${brand.brandVoice || "N/A"}
CONSTRAINTS: ${brand.negativeConstraints || "N/A"}
PALETTE: ${JSON.stringify(brand.colorPalette || {})}
`;
        }
    }

    const systemPrompt = `You are the STUDIO_ARCHITECTURE_AND_CONSISTENCY_OVERLORD.
Your mission is to ensure Absolute Consistency (Narrative, Visual, and Technical) across the production.

### CORE PROTOCOLS
1. CONTEXT LEDGER (SSOT): Validate all parameters against Brand DNA and Technical Breakdown.
2. CROSS-DEPARTMENT NEGOTIATION: If one department defines a constraint (e.g., lighting), inject it into others (Casting, Art).
3. VISUAL GUARDRAILS: Enforce character and set consistency.
4. RIGIDITY SCALE: Current Rigidity is ${rigidityScale}/100. 
   - High (>70): Prioritize DNA over creative notes.
   - Low (<30): Allow creative experimentation.

### OUTPUT format
Return JSON ONLY:
{
  "consistencyValidation": {
    "protectedParameters": ["list of strings"],
    "validatedAgainstDNA": boolean,
    "dnaAlignmentScore": number,
    "conflictsDetected": ["list of strings"],
    "remedialInstructions": "string (optional)"
  },
  "negotiatedConstraints": {
    "visual": "...",
    "technical": "...",
    "narrative": "...",
    "casting": "..."
  },
  "rigidityStatus": "ENFORCED | ADJUSTED | OVERRIDDEN",
  "feedbackLoopStatus": "APPROVED | REJECTED | ADJUSTED"
}`;

    const userPrompt = `TASK: ${taskDescription}
PROJECT CONTEXT: ${JSON.stringify(currentContext)}
BRAND DNA: ${brandDNA}

Execute consistency validation and negotiate constraints.`;

    // 2. Financial Control: Pre-flight check (simulated as we are in the agent)
    // 3. Invoke LLM
    const response = await invokeLLM({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
    });

    const raw = response.choices[0]?.message.content;
    const result = parseAgentJSON<OverlordOutput>(raw, "StudioOverlordAgent", {
        consistencyValidation: {
            protectedParameters: [],
            validatedAgainstDNA: false,
            dnaAlignmentScore: 0,
            conflictsDetected: ["Failed to parse Overlord output"]
        },
        negotiatedConstraints: {},
        rigidityStatus: "OVERRIDDEN",
        feedbackLoopStatus: "REJECTED"
    });

    // 4. Log Usage
    try {
        await db.insert(usageLedger).values({
            projectId,
            userId: String(project.userId),
            actionType: "CONSISTENCY_CHECK",
            modelId: response.model || "gemini-3.1-flash",
            quantity: 1,
            cost: "0.01", // Flat cost for orchestrator check
        });
    } catch (err) {
        console.error("Failed to log Overlord usage:", err);
    }

    return result;
}
