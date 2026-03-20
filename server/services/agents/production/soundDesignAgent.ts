import { invokeLLM } from "../../../_core/llm";
import { DirectorOutput } from "../pre-production/directorAgent";
import { parseAgentJSON } from "../_agentUtils";
import { injectBrandDirectives } from "../../../services/brandService";

export interface SoundDesignShot {
    shotNumber: number;
    roomToneLayers: string;
    environmentalSoundscape: string;
    foleySpecifics: string;
    dialogueCaptureMethod: string;
    dynamicRangeShifts: string;
    silenceStrategy: string;
    scoreDirection: string;
    frequencyEmphasis: string;
}

export interface SoundDesignOutput {
    generalStyle: string;
    shots: SoundDesignShot[];
}

const SOUND_DESIGN_FALLBACK: SoundDesignOutput = {
    generalStyle: "Standard cinematic sound design",
    shots: []
};

/**
 * SOUND DESIGN AGENT
 * Role: Tension Architect through Audio
 * Task: Designs full sonic environment.
 */
export async function runSoundDesignAgent(
    directorOutput: DirectorOutput,
    projectId?: number,
    globalNotes?: string,
    scaleMode?: string
): Promise<SoundDesignOutput> {
    try {
        let systemPrompt = `You are the SOUND_DESIGN_AGENT (Sonic Architecture Authority).
Your objective is to design the full sonic environment for the scene.

### DIRECTOR'S BRIEF ALIGNMENT ###
You will receive the Director's structured per-shot audio directives below. These contain SPECIFIC sound/music intent per shot.
You MUST incorporate the Director's audioNotes faithfully. Your role is to EXPAND and ENRICH them with sonic depth — not to contradict or ignore them.

You must strictly incorporate the Director's 'audioNotes' for each shot while adding sonic depth.

OUTPUT RESPONSIBILITIES:
- generalStyle: A summary of the auditory atmosphere.

PER SHOT RESPONSIBILITIES:
- roomToneLayers (Specific air, hum, or silence layers)
- environmentalSoundscape (Distant traffic, birds, machines)
- foleySpecifics (Tactile sounds: 'clothing rustle', 'footsteps on gravel')
- dialogueCaptureMethod (e.g. 'Boom up', 'Radio mic with clothing rustle', 'ADR required')
- dynamicRangeShifts (Sudden loudness or quietness)
- silenceStrategy (Why is it quiet?)
- scoreDirection (Musical or rhythmic intent)
- frequencyEmphasis (sub-bass, mid tension, high dissonance)

RULES:
- Sound must reinforce psychological objective from the Director.
- MUST reflect and expand upon the Director's specific technical intent.
- Silence is a tool, not absence.
- Must escalate with visual tension.

Return a JSON object matching the SoundDesignOutput interface.`;

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
                    content: `Director Output:\n${JSON.stringify(directorOutput, null, 2)}\n\nGlobal Notes:\n${globalNotes || 'None'}\n\nScale Mode:\n${scaleMode || 'Standard Cinematic'}`
                }
            ],
            response_format: { type: "json_object" }
        });

        const raw = response.choices[0]?.message.content;
        return parseAgentJSON<SoundDesignOutput>(raw, "SoundDesignAgent", SOUND_DESIGN_FALLBACK);
    } catch (err) {
        console.error("[SoundDesignAgent] LLM call failed:", err);
        return SOUND_DESIGN_FALLBACK;
    }
}
