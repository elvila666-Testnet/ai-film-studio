import { getDb, getProjectContent } from "../db";
import * as pdDb from "../db/productionDesign";
import { runProductionDesignAgent } from "./agents/production/productionDesignAgent";
import { productionDesignSets, productionDesignProps } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Service to handle Production Design breakdown logic.
 * Can be called from TRPC routers or background automation.
 */
export async function performProductionDesignBreakdown(projectId: number, ctx?: { userId: string }, refinementNotes?: string) {
    const db = await getDb();
    if (!db) throw new Error("Database unreachable");

    // 1. Clear existing sets and props (Casting-style refresh)
    console.log(`[PD_Service] Clearing existing PD data for project ${projectId}`);
    await db.delete(productionDesignProps).where(eq(productionDesignProps.projectId, projectId));
    await db.delete(productionDesignSets).where(eq(productionDesignSets.projectId, projectId));

    const content = await getProjectContent(projectId);
    if (!content?.technicalShots) {
        throw new Error("Director breakdown required first.");
    }

    const technicalScript = JSON.parse(content.technicalShots);
    console.log(`[PD_Service] Running Production Design Agent...`);
    
    // We can pass refinementNotes if this is a manual retry/refinement
    const pdOutput = await runProductionDesignAgent(
        technicalScript,
        projectId,
        content?.globalDirectorNotes ?? undefined,
        refinementNotes
    );

    // 2. Save new sets and props to DB
    const savedSets = [];
    for (const set of pdOutput.sets) {
        const setId = await pdDb.createPDSet(projectId, set);
        
        const savedProps = [];
        for (const prop of set.props) {
            const propId = await pdDb.createPDProp(projectId, setId, prop);
            savedProps.push({ ...prop, id: propId });
        }
        savedSets.push({ ...set, id: setId, props: savedProps });
    }

    return { sets: savedSets, generalStyle: pdOutput.generalStyle };
}
