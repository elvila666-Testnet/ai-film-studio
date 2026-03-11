/**
 * AI Orchestrator
 * " The Director " logic.
 * Chains Showrunner (Project Brief) -> Scenes -> Shots.
 */

import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { scenes, shots, usageLedger } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { analyzeScriptToScenes } from '../services/aiGeneration';
import { runCinemaExecutionPipeline } from '../services/cinemaOrchestrator';
import { getBrandContext } from './brandService';
import { projects } from '../../drizzle/schema';

import { runCreativeDirectorAgent } from '../services/agents/pre-production/creativeDirectorAgent';

export async function breakupScriptToScenes(projectId: number, script: string, userId?: string) {
    // 1. Analyze script using Gemini
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unreachable' });

    // Check project type to decide which "Head Agent" to use for logging/context
    const projectResult = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const project = projectResult[0];
    const isSpot = project?.type === 'spot';
    const headAgent = isSpot ? "CREATIVE_DIRECTOR" : "SHOWRUNNER";

    console.log(`[${headAgent}] Breaking script info scenes for project ${projectId}...`);

    try {
        const scenesList = await analyzeScriptToScenes(script);
        console.log(`[${headAgent}] Generated ${scenesList.length} scenes.`);

        for (const scene of scenesList) {
            await db.insert(scenes).values({
                projectId,
                order: scene.order,
                title: scene.title,
                description: scene.description,
                status: 'draft',
            });
        }

        // FinOps: Log Script Analysis
        if (userId) {
            await db.insert(usageLedger).values({
                projectId,
                userId,
                actionType: "SCRIPT_ANALYSIS",
                modelId: "gemini-3.1-flash",
                quantity: scenesList.length,
                cost: "0.05", // Estimated cost per run
            });
        }

    } catch (error) {
        console.error("Failed to break script to scenes:", error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to analyze script' });
    }
}

export async function breakupSceneToShots(sceneId: number, userId?: string) {
    // 1. Fetch scene details
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unreachable' });

    const sceneResult = await db.select().from(scenes).where(eq(scenes.id, sceneId)).limit(1);
    const scene = sceneResult[0];

    if (!scene) throw new TRPCError({ code: 'NOT_FOUND', message: 'Scene not found' });

    // 2. Fetch project and brand data
    const projectResult = await db.select().from(projects).where(eq(projects.id, scene.projectId)).limit(1);
    const project = projectResult[0];
    const brandId = project?.brandId;
    const isSpot = project?.type === 'spot';

    const headAgent = isSpot ? "CREATIVE_DIRECTOR" : "SHOWRUNNER";
    console.log(`[Director] Receiving mission from ${headAgent} for scene ${sceneId}: ${scene.title}`);

    try {
        const brandContext = brandId ? await getBrandContext(brandId) : "";

        // 3. Head Agent Consultation
        let missionContext = `SCENE: ${scene.title}\n\n${scene.description}`;

        if (isSpot) {
            console.log(`[Director] Consulting Creative Director for Brand DNA alignment...`);
            const creativeVision = await runCreativeDirectorAgent(
                brandContext,
                scene.description,
                project?.targetDuration || 30,
                project?.aspectRatio || "16:9"
            );
            missionContext = `COMMAND FROM CREATIVE DIRECTOR:
HOOK: ${creativeVision.commercialHook}
VISION/SCRIPT: ${creativeVision.script}
PACING: ${creativeVision.pacingLogic}
BRAND PLACEMENT: ${creativeVision.brandTaglinePlacement}

ORIGINAL SCENE CONTEXT:
${scene.description}`;
        }

        // 4. Ask Director to generate shot list using the head agent's mission
        const pipelineInput = {
            sceneScript: missionContext,
            globalNotes: brandContext,
            scaleMode: isSpot ? "Commercial High-Gloss" : "Cinematic Narrative"
        };
        const finalBlueprint = await runCinemaExecutionPipeline(pipelineInput);
        const enrichedShots = finalBlueprint.finalHarmonizedDocument.shots;

        console.log(`[Director] Generated ${enrichedShots.length} enriched shots from agents.`);

        for (const shot of enrichedShots) {
            await db.insert(shots).values({
                sceneId,
                order: shot.shotNumber,
                visualDescription: shot.directorIntent?.visualDescription || "Action",
                audioDescription: (shot.soundArchitecture?.environmentalSoundscape || "") + " | " + (shot.soundArchitecture?.foleySpecifics || ""),
                cameraAngle: shot.cameraSpecs?.shotType || "Medium Shot",
                movement: shot.cameraSpecs?.movementLogic || "Static",
                lighting: (shot.productionDesign?.environmentalAtmosphere || "") + " | " + (shot.cameraSpecs?.lightingSpec || ""),
                lens: (shot.cameraSpecs?.lensStrategy || "") + " | " + (shot.cameraSpecs?.tStop || ""),
                aiBlueprint: shot,
                status: 'planned',
            });
        }

        // FinOps: Log Shot Generation
        if (userId) {
            // Fetch projectID from scene
            const projectId = scene.projectId;
            await db.insert(usageLedger).values({
                projectId,
                userId,
                actionType: "SHOT_GENERATION",
                modelId: "gemini-3.1-flash",
                quantity: enrichedShots.length,
                cost: "0.02", // Estimated cost per scene
            });
        }

        return enrichedShots;

    } catch (error) {
        console.error("Failed to generate shots:", error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate shots' });
    }
}
