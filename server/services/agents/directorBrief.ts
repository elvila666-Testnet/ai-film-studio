/**
 * DirectorBrief — The Shared Communication Contract
 * 
 * This is the single structured interface that the Director produces
 * and ALL downstream agents (Cinematography, Production Design, Sound, Casting) consume.
 * It replaces the raw JSON.stringify() dump with explicit, typed directives.
 */

import type { DirectorTechnicalScript, DirectorOutput, DirectorShot } from "./pre-production/directorAgent";

// ─── Core Brief Interface ────────────────────────────────────────────────────

export interface PerShotDirective {
    shotNumber: number;
    visualDescription: string;
    emotionalObjective: string;
    cinematographyNotes: string;
    productionDesignNotes: string;
    audioNotes: string;
    castingRequirements: string;
    blockingGeometry: string;
}

export interface DirectorBrief {
    projectTitle: string;
    overallTone: string;
    emotionalArc: string;
    /** High-level camera/lens/movement requirements for the Cinematography department */
    cinematographyRequirements: string;
    /** High-level set/prop/wardrobe requirements for the Production Design department */
    productionDesignRequirements: string;
    /** High-level cast/talent requirements for the Casting department */
    castingRequirements: string;
    /** Per-shot directives — the Director's actual instructions per shot */
    perShotDirectives: PerShotDirective[];
    /** Brand DNA context (injected once, shared across all agents) */
    brandDNA?: string;
    /** Global director notes / user notes */
    globalNotes?: string;
}

// ─── Brief Builder Functions ─────────────────────────────────────────────────

/**
 * Build a DirectorBrief from the rich DirectorTechnicalScript (stored in DB after breakdownScript).
 * This is the preferred path — it contains the most detailed, structured requirements.
 */
export function buildBriefFromTechnicalScript(
    technicalScript: DirectorTechnicalScript,
    brandDNA?: string,
    globalNotes?: string
): DirectorBrief {
    const perShotDirectives: PerShotDirective[] = [];

    for (const scene of technicalScript.scenes) {
        for (const shot of scene.shots) {
            perShotDirectives.push({
                shotNumber: shot.shotNumber,
                visualDescription: shot.visualDescription || "",
                emotionalObjective: shot.emotionalObjective || "",
                cinematographyNotes: shot.cinematographyNotes || "",
                productionDesignNotes: shot.productionDesignNotes || "",
                audioNotes: shot.audioNotes || "",
                castingRequirements: shot.castingRequirements || "",
                blockingGeometry: shot.blockingGeometry || "",
            });
        }
    }

    return {
        projectTitle: technicalScript.projectTitle,
        overallTone: technicalScript.overallTone,
        emotionalArc: technicalScript.emotionalArc,
        cinematographyRequirements: technicalScript.cinematographyRequirements || "",
        productionDesignRequirements: technicalScript.productionDesignRequirements || "",
        castingRequirements: technicalScript.castingRequirements || "",
        perShotDirectives,
        brandDNA,
        globalNotes,
    };
}

/**
 * Build a DirectorBrief from the simpler DirectorOutput (from runDirectorAgent).
 * This is the fallback path — extracts what it can from the shot-level notes.
 */
export function buildBriefFromDirectorOutput(
    directorOutput: DirectorOutput,
    brandDNA?: string,
    globalNotes?: string
): DirectorBrief {
    const perShotDirectives: PerShotDirective[] = (directorOutput.shots || []).map((shot: DirectorShot) => ({
        shotNumber: shot.shotNumber,
        visualDescription: shot.visualDescription || "",
        emotionalObjective: shot.emotionalObjective || "",
        cinematographyNotes: shot.cinematographyNotes || "",
        productionDesignNotes: shot.productionDesignNotes || "",
        audioNotes: shot.audioNotes || "",
        castingRequirements: shot.castingRequirements || "",
        blockingGeometry: shot.blockingGeometry || "",
    }));

    // Aggregate department requirements from per-shot notes
    const cineNotes = perShotDirectives.map(d => d.cinematographyNotes).filter(Boolean);
    const pdNotes = perShotDirectives.map(d => d.productionDesignNotes).filter(Boolean);
    const castNotes = perShotDirectives.map(d => d.castingRequirements).filter(Boolean);

    return {
        projectTitle: directorOutput.sceneHeader || "Untitled",
        overallTone: directorOutput.emotionalObjective || "",
        emotionalArc: directorOutput.emotionalObjective || "",
        cinematographyRequirements: cineNotes.length > 0
            ? `Aggregated from ${cineNotes.length} shots:\n${cineNotes.map((n, i) => `Shot ${i + 1}: ${n}`).join("\n")}`
            : "",
        productionDesignRequirements: pdNotes.length > 0
            ? `Aggregated from ${pdNotes.length} shots:\n${pdNotes.map((n, i) => `Shot ${i + 1}: ${n}`).join("\n")}`
            : "",
        castingRequirements: castNotes.length > 0
            ? `Aggregated from ${castNotes.length} shots:\n${castNotes.map((n, i) => `Shot ${i + 1}: ${n}`).join("\n")}`
            : "",
        perShotDirectives,
        brandDNA,
        globalNotes,
    };
}

/**
 * Serialize the brief's per-shot directives for a specific department.
 * This produces a focused text block that agents can consume directly.
 */
export function serializeBriefForDepartment(
    brief: DirectorBrief,
    department: "cinematography" | "productionDesign" | "sound" | "casting"
): string {
    const sections: string[] = [];

    // High-level requirements
    switch (department) {
        case "cinematography":
            if (brief.cinematographyRequirements) {
                sections.push(`### DIRECTOR'S CINEMATOGRAPHY REQUIREMENTS ###\n${brief.cinematographyRequirements}`);
            }
            break;
        case "productionDesign":
            if (brief.productionDesignRequirements) {
                sections.push(`### DIRECTOR'S PRODUCTION DESIGN REQUIREMENTS ###\n${brief.productionDesignRequirements}`);
            }
            break;
        case "casting":
            if (brief.castingRequirements) {
                sections.push(`### DIRECTOR'S CASTING REQUIREMENTS ###\n${brief.castingRequirements}`);
            }
            break;
        case "sound":
            // No top-level sound requirements field, but we still have per-shot notes
            break;
    }

    // Per-shot directives
    const shotLines = brief.perShotDirectives.map(shot => {
        switch (department) {
            case "cinematography":
                return `Shot ${shot.shotNumber}: [Visual] ${shot.visualDescription} [Camera] ${shot.cinematographyNotes} [Emotion] ${shot.emotionalObjective} [Blocking] ${shot.blockingGeometry}`;
            case "productionDesign":
                return `Shot ${shot.shotNumber}: [Visual] ${shot.visualDescription} [PD] ${shot.productionDesignNotes} [Emotion] ${shot.emotionalObjective}`;
            case "sound":
                return `Shot ${shot.shotNumber}: [Visual] ${shot.visualDescription} [Audio] ${shot.audioNotes} [Emotion] ${shot.emotionalObjective}`;
            case "casting":
                return `Shot ${shot.shotNumber}: [Visual] ${shot.visualDescription} [Cast] ${shot.castingRequirements}`;
        }
    });

    if (shotLines.length > 0) {
        sections.push(`### PER-SHOT DIRECTOR DIRECTIVES ###\n${shotLines.join("\n")}`);
    }

    // Brand DNA
    if (brief.brandDNA) {
        sections.push(`### BRAND DNA ###\n${brief.brandDNA}`);
    }

    // Global notes
    if (brief.globalNotes) {
        sections.push(`### GLOBAL DIRECTOR NOTES ###\n${brief.globalNotes}`);
    }

    return sections.join("\n\n");
}
