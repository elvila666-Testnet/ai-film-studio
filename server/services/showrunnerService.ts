/**
 * Showrunner Service — "The Project Lead"
 * Assembles the Production Bible JSON from all departments.
 * This file is the single source of truth for all production context.
 */

import { getDb } from "../db";
import {
    scenes,
    shots,
    characters,
    projects,
    type Scene,
    type Shot,
    type Character,
} from "../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { NANOBANANA_PRO_CRITERIA } from "./aiGeneration";

// ─── Production Bible Types ───────────────────────────────────────────

export interface CharacterProfile {
    name: string;
    description: string;
    imageUrl: string;
}

export interface ShotBreakdown {
    order: number;
    visualDescription: string;
    cameraAngle: string;
    movement: string;
    lighting: string;
    lens: string;
    audioDescription: string;
}

export interface SceneBreakdown {
    order: number;
    title: string;
    description: string;
    shots: ShotBreakdown[];
}

export interface CinematographySpec {
    camera: string;
    lenses: string;
    resolution: string;
    colorGrading: string;
    visualStyle: string;
}

export interface ProductionDesignSpec {
    locations: string[];
    keyProps: string[];
    costumes: Record<string, string>;
    colorPalette: string;
    materials: string;
}

export interface ProductionBible {
    project: {
        id: number;
        title: string;
        genre: string;
    };
    characters: CharacterProfile[];
    technicalScript: SceneBreakdown[];
    cinematography: CinematographySpec;
    productionDesign: ProductionDesignSpec;
    globalDirectives: string;
}

// ─── Showrunner: Assemble Production Bible ────────────────────────────

export async function assembleProductionBible(
    projectId: number,
    globalDirectives?: string
): Promise<ProductionBible> {
    const db = await getDb();
    if (!db) throw new Error("Database unreachable");

    // 1. PROJECT METADATA
    const projectResult = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
    const project = projectResult[0];
    if (!project) throw new Error(`Project ${projectId} not found`);

    // 2. CHARACTERS (from Casting Director)
    const characterList = await db
        .select()
        .from(characters)
        .where(eq(characters.projectId, projectId));

    const characterProfiles: CharacterProfile[] = characterList.map(
        (c: Character) => ({
            name: c.name,
            description: c.description || "",
            imageUrl: c.imageUrl || "draft",
        })
    );

    // 3. TECHNICAL SCRIPT (from Scriptwriter → Director)
    const sceneList = await db
        .select()
        .from(scenes)
        .where(eq(scenes.projectId, projectId))
        .orderBy(scenes.order);

    const technicalScript: SceneBreakdown[] = [];

    if (sceneList.length > 0) {
        const sceneIds = sceneList.map((s: Scene) => s.id);
        const shotList = await db
            .select()
            .from(shots)
            .where(inArray(shots.sceneId, sceneIds))
            .orderBy(shots.order);

        for (const scene of sceneList) {
            const sceneShots = shotList
                .filter((s: Shot) => s.sceneId === scene.id)
                .map((s: Shot) => ({
                    order: s.order,
                    visualDescription: s.visualDescription || "Action",
                    cameraAngle: s.cameraAngle || "Medium Shot",
                    movement: s.movement || "Static",
                    lighting: s.lighting || "Natural",
                    lens: s.lens || "Cinematic",
                    audioDescription: s.audioDescription || "Ambient",
                }));

            technicalScript.push({
                order: scene.order,
                title: scene.title || `Scene ${scene.order}`,
                description: scene.description || "",
                shots: sceneShots,
            });
        }
    }

    // 4. CINEMATOGRAPHY (from Cinematographer — Nanobanana Pro defaults)
    const cinematography: CinematographySpec = {
        camera: "Arri Alexa 35",
        lenses: "Anamorphic and Ultra Prime Zeiss lenses",
        resolution: "8K",
        colorGrading: "HDR (High Dynamic Range) and Dolby Vision",
        visualStyle: NANOBANANA_PRO_CRITERIA,
    };

    // 5. PRODUCTION DESIGN (extracted from scenes + brand)
    const allDescriptions = technicalScript
        .map((s) => s.description)
        .join(" ");
    const locationMatches = allDescriptions.match(
        /(?:INT\.|EXT\.)\s+([^\-\n]+)/gi
    );
    const locations = locationMatches
        ? [...new Set(locationMatches.map((l) => l.trim()))]
        : ["Unspecified"];

    const productionDesign: ProductionDesignSpec = {
        locations,
        keyProps: [],
        costumes: characterProfiles.reduce(
            (acc, c) => {
                acc[c.name] = `As described in character profile`;
                return acc;
            },
            {} as Record<string, string>
        ),
        colorPalette: "Cinematic — rich, deep tones",
        materials: "Hyper-realistic textures: skin pores, fabric weaves, environmental details",
    };

    // 6. ASSEMBLE THE BIBLE
    const bible: ProductionBible = {
        project: {
            id: projectId,
            title: project.name || `Project ${projectId}`,
            genre: "Cinematic",
        },
        characters: characterProfiles,
        technicalScript,
        cinematography,
        productionDesign,
        globalDirectives: globalDirectives || "",
    };

    console.log(
        `[Showrunner] Production Bible assembled: ${bible.characters.length} characters, ${bible.technicalScript.length} scenes, ${bible.technicalScript.reduce((a, s) => a + s.shots.length, 0)} total shots`
    );

    return bible;
}
