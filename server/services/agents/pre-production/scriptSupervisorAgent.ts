import { invokeLLM } from "../../../_core/llm";
import { DirectorOutput } from "./directorAgent";
import { CinematographyOutput } from "../production/cinematographyAgent";
import { ProductionDesignOutput } from "../production/productionDesignAgent";
import { SoundDesignOutput } from "../production/soundDesignAgent";
import { parseAgentJSON } from "../_agentUtils";

export interface FinalShotBreakdown {
    shotNumber: number;
    directorIntent: {
        visualDescription?: string;
        emotionalObjective?: string;
        psychologicalIntent?: string;
    };
    cameraSpecs: {
        shotType?: string;
        lensStrategy?: string;
        tStop?: string;
        movementLogic?: string;
        lightingSpec?: string;
    };
    productionDesign: {
        environmentalAtmosphere?: string;
        textureSpecs?: string;
        physicalAssets?: string[];
        colorPalette?: string;
        wardrobeDetails?: string;
    };
    soundArchitecture: {
        environmentalSoundscape?: string;
        scoreDirection?: string;
        foleySpecifics?: string;
    };
}

export interface ScriptSupervisorOutput {
    continuityValidation: string;
    technicalConflictReport: string;
    finalHarmonizedDocument: {
        sceneHeader: string;
        emotionalObjective: string;
        shots: FinalShotBreakdown[];
    };
}

/**
 * Builds a fallback harmonized document by directly merging director + department outputs.
 * Used when the LLM call fails or returns invalid JSON, so the UI always has data to display.
 */
function buildFallbackBlueprint(
    directorOutput: DirectorOutput,
    cinematographyOutput: CinematographyOutput,
    productionDesignOutput: ProductionDesignOutput,
    soundDesignOutput: SoundDesignOutput,
): ScriptSupervisorOutput {
    const shots: FinalShotBreakdown[] = directorOutput.shots.map((shot) => ({
        shotNumber: shot.shotNumber,
        directorIntent: {
            visualDescription: shot.visualDescription,
            emotionalObjective: shot.emotionalObjective,
            psychologicalIntent: shot.psychologicalIntent,
        },
        cameraSpecs: (cinematographyOutput.shots && Array.isArray(cinematographyOutput.shots)) 
            ? (cinematographyOutput.shots.find(s => s.shotNumber === shot.shotNumber) ?? {
                shotType: "Medium Shot",
                lensStrategy: "Standard Lens",
                tStop: "T2.8",
                movementLogic: "Static",
                lightingSpec: "Standard cinematic lighting",
            })
            : {
                shotType: "Medium Shot",
                lensStrategy: "Standard Lens",
                tStop: "T2.8",
                movementLogic: "Static",
                lightingSpec: "Standard cinematic lighting",
            },
        productionDesign: (() => {
            const pdShots = (productionDesignOutput.shots && Array.isArray(productionDesignOutput.shots)) 
                ? productionDesignOutput.shots 
                : [];
            const pdShot = pdShots.find(s => s.shotNumber === shot.shotNumber);
            if (!pdShot) return { environmentalAtmosphere: "Standard environment" };
            return {
                environmentalAtmosphere: pdShot.environmentalAtmosphere,
                textureSpecs: pdShot.materials,
                physicalAssets: pdShot.heroProps ? [pdShot.heroProps] : [],
                colorPalette: pdShot.colorPalette,
                wardrobeDetails: pdShot.wardrobeDetails,
            };
        })(),
        soundArchitecture: (() => {
            const sShots = (soundDesignOutput.shots && Array.isArray(soundDesignOutput.shots)) 
                ? soundDesignOutput.shots 
                : [];
            const soundShot = sShots.find(s => s.shotNumber === shot.shotNumber);
            if (!soundShot) return { environmentalSoundscape: "Standard ambience" };
            return {
                environmentalSoundscape: soundShot.environmentalSoundscape,
                scoreDirection: soundShot.scoreDirection,
                foleySpecifics: soundShot.foleySpecifics,
            };
        })(),
    }));

    return {
        continuityValidation: "Auto-merged by ScriptSupervisor fallback — LLM harmonization was unavailable.",
        technicalConflictReport: "None (fallback mode — no conflict analysis performed).",
        finalHarmonizedDocument: {
            sceneHeader: directorOutput.sceneHeader,
            emotionalObjective: directorOutput.emotionalObjective,
            shots,
        },
    };
}

/**
 * SCRIPT SUPERVISOR AGENT
 * Role: Continuity & Structural Integrity Controller
 * Task: Validates coherence and execution readiness. Merges into final blueprint.
 * If the LLM call fails, it falls back to a locally-merged document so the pipeline always completes.
 */
export async function runScriptSupervisorAgent(
    directorOutput: DirectorOutput,
    cinematographyOutput: CinematographyOutput,
    productionDesignOutput: ProductionDesignOutput,
    soundDesignOutput: SoundDesignOutput,
    globalNotes?: string
): Promise<ScriptSupervisorOutput> {
    const fallback = buildFallbackBlueprint(directorOutput, cinematographyOutput, productionDesignOutput, soundDesignOutput);

    try {
        const response = await invokeLLM({
            messages: [
                {
                    role: "system",
                    content: `You are the SCRIPT_SUPERVISOR_AGENT (Structural Integrity Controller).
Your objective is to validate coherence and execution readiness across all department inputs, and output a final harmonized document.

RESPONSIBILITIES:
- Continuity validation
- Prop consistency check
- Lighting logic consistency
- Emotional escalation consistency
- Timeline realism
- Technical contradiction detection

RULES:
- Do not rewrite the creative intent.
- Flag inconsistencies in the conflict report.
- Harmonize the document into a final production-ready blueprint.

OUTPUT FORMAT (JSON containing):
- continuityValidation: A summary string of continuity checks.
- technicalConflictReport: A summary string of any detected conflicts or "None".
- finalHarmonizedDocument: 
  - sceneHeader
  - emotionalObjective
  - shots (Array merging directorIntent, cameraSpecs, productionDesign, soundArchitecture for each shot)
  
Each shot in the shots array must have:
  - shotNumber (number)
  - directorIntent: { visualDescription, emotionalObjective, psychologicalIntent }
  - cameraSpecs: { shotType, lensStrategy, tStop, movementLogic, lightingSpec }
  - productionDesign: { environmentalAtmosphere, textureSpecs, physicalAssets (array), colorPalette, wardrobeDetails }
  - soundArchitecture: { environmentalSoundscape, scoreDirection, foleySpecifics }`
                },
                {
                    role: "user",
                    content: `Director Output:\n${JSON.stringify(directorOutput)}\n\nCinematography Output:\n${JSON.stringify(cinematographyOutput)}\n\nProduction Design Output:\n${JSON.stringify(productionDesignOutput)}\n\nSound Design Output:\n${JSON.stringify(soundDesignOutput)}\n\nGlobal Notes:\n${globalNotes || 'None'}`
                }
            ],
            response_format: { type: "json_object" }
        });

        const raw = response.choices[0]?.message.content;
        const parsed = parseAgentJSON<ScriptSupervisorOutput>(raw, "ScriptSupervisorAgent", fallback);

        // Validate the parsed result has the required structure
        if (
            !parsed.finalHarmonizedDocument ||
            !Array.isArray(parsed.finalHarmonizedDocument.shots) ||
            parsed.finalHarmonizedDocument.shots.length === 0
        ) {
            console.warn("[ScriptSupervisorAgent] Parsed output missing shots array. Using fallback.");
            return fallback;
        }

        return parsed;
    } catch (err) {
        console.error("[ScriptSupervisorAgent] LLM call failed. Returning locally-merged fallback blueprint:", err);
        return fallback;
    }
}
