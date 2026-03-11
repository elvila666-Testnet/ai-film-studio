import { getDb } from "../db";
import { productionDesignSets, productionDesignProps, shots } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export async function createPDSet(projectId: number, data: any) {
    const db = await getDb();
    if (!db) throw new Error("Database unreachable");

    const [inserted] = await db.insert(productionDesignSets).values({
        projectId,
        name: data.name,
        description: data.description,
        atmospherePhilosophy: data.atmospherePhilosophy,
        imageGenerationPrompt: data.imageGenerationPrompt,
        imageUrl: data.imageUrl || "draft",
        referenceImageUrl: data.referenceImageUrl,
        status: data.status || "draft",
    }).$returningId();

    return inserted.id;
}

export async function getPDSet(setId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database unreachable");

    const result = await db.select().from(productionDesignSets).where(eq(productionDesignSets.id, setId)).limit(1);
    return result[0];
}

export async function getProjectPDSets(projectId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database unreachable");

    return await db.select().from(productionDesignSets).where(eq(productionDesignSets.projectId, projectId));
}

export async function updatePDSet(setId: number, data: any) {
    const db = await getDb();
    if (!db) throw new Error("Database unreachable");

    await db.update(productionDesignSets).set(data).where(eq(productionDesignSets.id, setId));
}

export async function deletePDSet(setId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database unreachable");

    await db.delete(productionDesignSets).where(eq(productionDesignSets.id, setId));
}

export async function createPDProp(projectId: number, setId: number | null, data: any) {
    const db = await getDb();
    if (!db) throw new Error("Database unreachable");

    const [inserted] = await db.insert(productionDesignProps).values({
        projectId,
        setId,
        name: data.name,
        description: data.description,
        symbolism: data.symbolism,
        imageGenerationPrompt: data.imageGenerationPrompt,
        imageUrl: data.imageUrl || "draft",
        referenceImageUrl: data.referenceImageUrl,
    }).$returningId();

    return inserted.id;
}

export async function getSetPDProps(setId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database unreachable");

    return await db.select().from(productionDesignProps).where(eq(productionDesignProps.setId, setId));
}

export async function updatePDProp(propId: number, data: any) {
    const db = await getDb();
    if (!db) throw new Error("Database unreachable");

    await db.update(productionDesignProps).set(data).where(eq(productionDesignProps.id, propId));
}

export async function deletePDProp(propId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database unreachable");

    await db.delete(productionDesignProps).where(eq(productionDesignProps.id, propId));
}

export async function updateShotReferenceImage(shotId: number, referenceImageUrl: string) {
    const db = await getDb();
    if (!db) throw new Error("Database unreachable");

    await db.update(shots).set({ referenceImageUrl }).where(eq(shots.id, shotId));
}

export async function updateSetReferenceImage(setId: number, referenceImageUrl: string) {
    const db = await getDb();
    if (!db) throw new Error("Database unreachable");

    await db.update(productionDesignSets).set({ referenceImageUrl }).where(eq(productionDesignSets.id, setId));
}
