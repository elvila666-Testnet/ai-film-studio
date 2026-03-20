import { invokeLLM } from "../../../_core/llm";
import { DirectorTechnicalScript, DirectorOutput } from "../pre-production/directorAgent";
import { parseAgentJSON } from "../_agentUtils";
import { injectBrandDirectives } from "../../../services/brandService";

export interface PDProp {
    name: string;
    description: string;
    symbolism: string;
    imageGenerationPrompt: string; // Prompt for a detail/macro product shot
}

export interface PDSet {
    name: string;
    description: string;
    atmospherePhilosophy: string;
    imageGenerationPrompt: string; // Prompt for the master wide set photo
    props: PDProp[];
}

export interface ProductionDesignShot {
    shotNumber: number;
    environmentalAtmosphere: string;
    materials: string;
    heroProps: string;
    colorPalette: string;
    wardrobeDetails: string;
}

export interface ProductionDesignOutput {
    generalStyle: string;
    sets: PDSet[];
    shots: ProductionDesignShot[];
}

const PRODUCTION_DESIGN_FALLBACK: ProductionDesignOutput = {
    generalStyle: "Standard cinematic production design",
    sets: [],
    shots: []
};

/**
 * PRODUCTION DESIGN AGENT
 * Role: Art Director & World Builder
 * Task: Breaks down script into specific physical sets and props.
 */
export async function runProductionDesignAgent(
    directorOutput: DirectorOutput | DirectorTechnicalScript,
    projectId?: number,
    globalNotes?: string,
    refinementNotes?: string
): Promise<ProductionDesignOutput> {
    try {
        let systemPrompt = `You are the PRODUCTION_DESIGN_AGENT (Art Director & World Builder).
Your objective is to transform the Director's technical script into a granular list of unique physical SETS and HERO PROPS.

### DIRECTOR'S BRIEF ALIGNMENT ###
You will receive the Director's structured per-shot PD directives below. These contain SPECIFIC set/prop/wardrobe/color requirements per shot.
You MUST incorporate these directives exhaustively. If the Director specifies a color palette, it is the ABSOLUTE LAW.
If the Director mentions specific hero props, every single one MUST appear in your output. Failure to reflect Director-specified items = REJECTION.

### MISSION: THE ART OF PHYSICAL WORLD-BUILDING ###
1. IDENTIFY UNIQUE SETS: Cluster scenes by location. Define the architectural logic of each.
2. MANDATORY HERO PROPS & VEHICLES: You MUST extract EVERY SINGLE specific prop, vehicle, weapon, or item mentioned in the script or notes. DO NOT SUMMARIZE. DO NOT OMIT ANYTHING. (e.g., if a specific car or drafting pencil is mentioned, it MUST be an isolated prop entry in the correct set).
3. TEXTURAL CONTRAST: Define the material logic explicitly as required by the director's notes. Use the exact textures requested.
4. WARDROBE INTEGRATION: Map specific wardrobe items exactly as described to the shot level.
5. COLOR PALETTE LAW: The palette defined in the Director's Directives, script, or Brand DNA is the absolute physical law. It MUST be the dominant driver for all sets, props, and gear. Do not invent a palette if one is provided.
6. NO HARDCODING: Do not assume specific brands, colors, or environments unless explicitly in the Director's brief or notes.
7. EXHAUSTIVE EXTRACTION FAILURES LEAD TO REJECTION. If you summarize or leave out a specific hero prop requested by the Director, you fail.
${refinementNotes ? `\n### REFINEMENT INSTRUCTIONS ###\nThe Director has provided the following feedback on your previous output. You MUST strictly incorporate these changes while maintaining the core vision:\n${refinementNotes}\n` : ""}

### OUTPUT FORMAT (JSON) ###
{
  "generalStyle": "High-level visual world-building philosophy",
  "sets": [
    {
      "name": "Set Name",
      "description": "Tactile description...",
      "atmospherePhilosophy": "Emotional weight...",
      "imageGenerationPrompt": "Wide-angle set photo prompt...",
      "props": [
        {
          "name": "Prop Name",
          "description": "Physical details...",
          "symbolism": "Narrative purpose",
          "imageGenerationPrompt": "Macro detail shot prompt..."
        }
      ]
    }
  ],
  "shots": [
    {
      "shotNumber": number,
      "environmentalAtmosphere": "The physical state of the set in this specific shot",
      "materials": "Scalar string of textures/materials",
      "heroProps": "Specific prop used in this shot",
      "colorPalette": "DOMINANT HEX CODES for this shot",
      "wardrobeDetails": "Specific wardrobe/gear worn in this shot"
    }
  ]
}

### RULES ###
- EXHAUSTIVE PROPS: If a prop, vehicle, specific tool, or wardrobe piece is in the script/notes, it MUST have a standalone JSON entry in the props array or shot logic. Do not group them.
- MATERIAL RIGOR: Use technical material terms exactly as requested (e.g., if carbon fiber is requested, use it).
- CINEMATIC COHESION: If a brand palette is provided, it is the absolute LAW for all visual elements.
- SHOT LOGIC: Ensure "shots" array maps per-shot directorial intent to physical set states. The Director will reject you if you omit these specific requests.`;

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
                    content: `Director Technical Script:\n${JSON.stringify(directorOutput, null, 2)}\n\nGlobal Notes:\n${globalNotes || 'None'}`
                }
            ],
            response_format: { type: "json_object" }
        });

        const raw = response.choices[0]?.message.content;
        return parseAgentJSON<ProductionDesignOutput>(raw, "ProductionDesignAgent", PRODUCTION_DESIGN_FALLBACK);
    } catch (err) {
        console.error("[ProductionDesignAgent] LLM call failed:", err);
        return PRODUCTION_DESIGN_FALLBACK;
    }
}
