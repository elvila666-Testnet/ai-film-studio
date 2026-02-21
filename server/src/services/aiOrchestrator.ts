/**
 * AI Orchestrator
 * " The Director " logic.
 * Chains Showrunner (Project Brief) -> Scenes -> Shots.
 */

import { TRPCError } from '@trpc/server';
import { getDb } from '../../db';
import { scenes, shots, usageLedger } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { analyzeScriptToScenes, generateTechnicalShots } from '../../services/aiGeneration';
import { getBrandContext } from './brandService';
import { projects } from '../../../drizzle/schema';

export async function breakupScriptToScenes(projectId: number, script: string, userId?: string) {
    // 1. Analyze script using Gemini
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unreachable' });

    console.log(`[Director] Breaking script info scenes for project ${projectId}...`);

    try {
        const scenesList = await analyzeScriptToScenes(script);
        console.log(`[Director] Generated ${scenesList.length} scenes.`);

        // 2. Clear existing scenes (optional? or just append? safer to clear for "regenerate")
        // For now, we assume this is a fresh breakdown.
        // await db.delete(scenes).where(eq(scenes.projectId, projectId)); 

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
                modelId: "gemini-1.5-pro",
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

    console.log(`[Director] Generating shots for scene ${sceneId}: ${scene.title}`);

    try {
        // 2. Fetch project and brand data
        const projectResult = await db.select().from(projects).where(eq(projects.id, scene.projectId)).limit(1);
        const brandId = projectResult[0]?.brandId;
        const brandContext = brandId ? await getBrandContext(brandId) : "";

        // 3. Ask AI to generate shot list
        // We synthesize a mini-script for the context
        const sceneContext = `SCENE: ${scene.title}\n\n${scene.description}`;

        // We use generateTechnicalShots from aiGeneration
        // Passing brandContext to ensure brand consistency
        const technicalShots = await generateTechnicalShots(sceneContext, "Standard Cinematic", undefined, brandContext);

        console.log(`[Director] Generated ${technicalShots.length} shots.`);

        for (const shot of technicalShots) {
            await db.insert(shots).values({
                sceneId,
                order: shot.shot,
                visualDescription: shot.accion,
                audioDescription: shot.audio,
                cameraAngle: shot.tipo_plano,
                movement: shot.movimiento,
                lighting: shot.iluminacion,
                lens: shot.tecnica,
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
                modelId: "gemini-1.5-pro",
                quantity: technicalShots.length,
                cost: "0.02", // Estimated cost per scene
            });
        }

        return technicalShots;

    } catch (error) {
        console.error("Failed to generate shots:", error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate shots' });
    }
}
