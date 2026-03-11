import { describe, it, expect, vi } from 'vitest';
import { runCinemaExecutionPipeline } from './services/cinemaOrchestrator';
import * as llm from './_core/llm';

// Mock the core LLM invocation
vi.mock('./_core/llm', () => ({
    invokeLLM: vi.fn(),
}));

describe('Cinema Execution Pipeline (Multi-Agent Architecture)', () => {
    it('executes the full pipeline and merges outputs correctly', async () => {
        // Mock responses for each agent in order of execution
        // 1. Director Agent
        vi.mocked(llm.invokeLLM).mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify({
                        sceneHeader: "INT. COFFEE SHOP - DAY",
                        emotionalObjective: "Tension leading to realization",
                        shots: [{
                            shotNumber: 1,
                            visualDescription: "Protagonist stares coffee",
                            emotionalObjective: "Isolation",
                            escalationMap: "Low tension",
                            psychologicalIntent: "Focus on internal thoughts",
                            blockingGeometry: "Static sitting cross-table"
                        }]
                    })
                }
            }]
        } as any);

        // 2, 3, 4. Parallel Agents (Cinematography, PD, Sound)
        // Since they run in parallel, Promise.all handles them. Viest mockResolvedValueOnce queues them.
        vi.mocked(llm.invokeLLM).mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify({
                        generalStyle: "Cinematic Realistic",
                        shots: [{
                            shotNumber: 1,
                            shotType: "Close Up",
                            cameraBody: "Arri Alexa",
                            sensorFormat: "Super 35",
                            lensStrategy: "50mm",
                            tStop: "T2.0",
                            focusStrategy: "Rack focus",
                            movementLogic: "Static",
                            depthArchitecture: "Shallow DOF",
                            psychologicalLensJustification: "Isolate character",
                            lightingSpec: "High contrast"
                        }]
                    })
                }
            }]
        } as any);

        vi.mocked(llm.invokeLLM).mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify({
                        generalStyle: "Gritty realism",
                        shots: [{
                            shotNumber: 1,
                            architectureStyle: "Modern Glass",
                            materials: "Wood and steel",
                            surfaceTextureQuality: "Worn",
                            environmentalAtmosphere: "Dusty",
                            colorPalette: "Desaturated",
                            backgroundActivity: "None",
                            heroProps: "Coffee cup",
                            propSymbolism: "Routine",
                            spatialDepthEnhancement: "Silhouettes"
                        }]
                    })
                }
            }]
        } as any);

        vi.mocked(llm.invokeLLM).mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify({
                        generalStyle: "Oppressive Room Tone",
                        shots: [{
                            shotNumber: 1,
                            roomToneLayers: "Heavy AC hum",
                            environmentalSoundscape: "Muted street noise",
                            foleySpecifics: "Cup clinking",
                            dialogueCaptureMethod: "Boom",
                            dynamicRangeShifts: "None",
                            silenceStrategy: "Tension-building",
                            scoreDirection: "Low drone",
                            frequencyEmphasis: "Sub-bass"
                        }]
                    })
                }
            }]
        } as any);

        // 5. Script Supervisor Agent
        vi.mocked(llm.invokeLLM).mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify({
                        continuityValidation: "Passed",
                        technicalConflictReport: "None",
                        finalHarmonizedDocument: {
                            sceneHeader: "INT. COFFEE SHOP - DAY",
                            emotionalObjective: "Tension leading to realization",
                            shots: [{
                                shotNumber: 1,
                                directorIntent: { visualDescription: "Protagonist stares coffee" },
                                cameraSpecs: { shotType: "Close Up" },
                                productionDesign: { environmentalAtmosphere: "Dusty" },
                                soundArchitecture: { environmentalSoundscape: "Muted street noise" }
                            }]
                        }
                    })
                }
            }]
        } as any);

        const result = await runCinemaExecutionPipeline({
            sceneScript: "INT. COFFEE SHOP - DAY\nCharacter sits alone.",
            globalNotes: "Make it moody.",
            scaleMode: "Intimate Drama"
        });

        // Validations
        expect(llm.invokeLLM).toHaveBeenCalledTimes(5);
        expect(result.continuityValidation).toEqual("Passed");
        expect(result.finalHarmonizedDocument.shots.length).toBe(1);
        expect(result.finalHarmonizedDocument.shots[0].directorIntent.visualDescription).toEqual("Protagonist stares coffee");
        expect(result.finalHarmonizedDocument.shots[0].cameraSpecs.shotType).toEqual("Close Up");
    });
});
