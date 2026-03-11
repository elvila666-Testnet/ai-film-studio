import { invokeLLM } from "../../../_core/llm";
import { getDb, getProjectContent } from "../../../db";
import { projectContent } from "../../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export interface ScriptWriterOutput {
    synopsis?: string;
    script?: string;
    status: "draft" | "pending_review" | "approved";
    feedback?: string;
}

/**
 * SCRIPT WRITER AGENT
 * Role: Story Creation & Handoff  
 * Translates a creative brief into synopsis → script.
 * Sets scriptStatus to "pending_review" once content is generated.
 * Director receives script only after status = "approved".
 */

export async function generateSynopsis(
    projectId: number,
    brief: string,
    brandDNA?: string,
    projectType?: string,
    targetDuration?: number
): Promise<{ synopsis: string }> {
    const systemPrompt = brandDNA
        ? `You are a professional script writer. Always align your work with brand DNA:\n${brandDNA}`
        : `You are a professional script writer. Transform briefs into compelling cinematic stories.`;

    const response = await invokeLLM({
        messages: [
            { role: "system", content: systemPrompt },
            {
                role: "user",
                content: `Write a cinematic synopsis for the following brief:\n\n${brief}\n\nProject Format: ${projectType || 'Short Film'}\nTarget Duration: ${targetDuration ? targetDuration + ' seconds' : '2-3 minutes'}\n\nKeep it strictly under 200 words. Focus on visual storytelling, emotional arc, and core conflict.`
            }
        ]
    });

    const synopsis = (response.choices[0]?.message.content ?? "") as string;

    const db = await getDb();
    if (db) {
        await db.update(projectContent)
            .set({ synopsis, brief, scriptStatus: "pending_review" })
            .where(eq(projectContent.projectId, projectId));
    }

    return { synopsis };
}

export async function generateScript(
    projectId: number,
    synopsis: string,
    brandDNA?: string,
    globalNotes?: string,
    projectType?: string,
    targetDuration?: number
): Promise<{ script: string }> {
    const systemPrompt = [
        `You are a professional screenwriter. Write in standard screenplay format.`,
        brandDNA ? `Brand DNA: ${brandDNA}` : null,
        globalNotes ? `Director Notes: ${globalNotes}` : null,
    ].filter(Boolean).join("\n\n");

    const response = await invokeLLM({
        messages: [
            { role: "system", content: systemPrompt },
            {
                role: "user",
                content: `Write a full screenplay from this synopsis:\n\n${synopsis}\n\nProject Format: ${projectType || 'Short Film'}\nTarget Duration: ${targetDuration ? targetDuration + ' seconds' : '2-3 minutes'} of screen time.\n\nFormat: Scene Headings, Action Lines, Dialogue.`
            }
        ]
    });

    const script = (response.choices[0]?.message.content ?? "") as string;

    const db = await getDb();
    if (db) {
        await db.update(projectContent)
            .set({ script, scriptStatus: "pending_review" })
            .where(eq(projectContent.projectId, projectId));
    }

    return { script };
}

export async function refineScript(
    projectId: number,
    script: string,
    notes: string,
    brandDNA?: string
): Promise<{ script: string }> {
    const response = await invokeLLM({
        messages: [
            {
                role: "system",
                content: `You are a professional script editor. Refine the script based on the director's notes.${brandDNA ? `\nBrand DNA: ${brandDNA}` : ""}`
            },
            {
                role: "user",
                content: `Original Script:\n${script}\n\nDirector Notes:\n${notes}\n\nProvide only the refined script text.`
            }
        ]
    });

    const refined = (response.choices[0]?.message.content ?? "") as string;

    const db = await getDb();
    if (db) {
        await db.update(projectContent)
            .set({ script: refined, scriptStatus: "pending_review" })
            .where(eq(projectContent.projectId, projectId));
    }

    return { script: refined };
}

export async function approveScript(projectId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

    const content = await getProjectContent(projectId);
    if (!content?.script) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No script to approve. Generate a script first." });
    }

    await db.update(projectContent)
        .set({ scriptStatus: "approved" })
        .where(eq(projectContent.projectId, projectId));

    console.log(`[ScriptWriterAgent] Script approved for project ${projectId}. Handing off to Director.`);
}
