import { invokeLLM } from "../../../_core/llm";
import { getDb } from "../../../db";
import { storyboardImages, shots, scenes } from "../../../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export interface ShootingIngredients {
    keyframeUrl: string;         // Approved 4K frame from storyboardImages.masterImageUrl
    cameraAngle: string;
    movement: string;
    lighting: string;
    lens: string;
    visualDescription: string;
    audioDescription?: string;
    characterReferenceUrls: string[];
}

/**
 * SHOOTING AGENT
 * Takes an approved 4K keyframe + Director shot specs and builds the final
 * video generation prompt. Delegates actual video call to the video router.
 */
export async function buildVideoPrompt(ingredients: ShootingIngredients): Promise<string> {
    const response = await invokeLLM({
        messages: [
            {
                role: "system",
                content: `You are the SHOOTING_AGENT — a video prompt specialist.
Your job is to transform shot specifications into a precise, detailed video generation prompt.
The prompt must be optimized for AI video models (Sora, Veo 3, Kling, Flow).

RULES:
- Start with the camera movement and angle
- Describe the visual action in present tense, active voice
- Include lighting quality and atmosphere
- Include lens characteristics (e.g., "shot on 35mm anamorphic")
- Keep it under 200 words but highly specific
- Do NOT include dialogue or sound descriptions — visual only`
            },
            {
                role: "user",
                content: `Build a video generation prompt from these specifications:

Camera: ${ingredients.cameraAngle} | Movement: ${ingredients.movement}
Lens: ${ingredients.lens} | Lighting: ${ingredients.lighting}
Visual Action: ${ingredients.visualDescription}
Reference Keyframe: Attached (the 4K approved frame is the visual starting point)`
            }
        ]
    });

    return (response.choices[0]?.message.content ?? ingredients.visualDescription) as string;
}

/**
 * Get all the ingredients needed to shoot a storyboard frame.
 * Reads the 4K keyframe + corresponding DB shot data.
 */
export async function getShootingIngredients(
    storyboardImageId: number,
    projectId: number
): Promise<ShootingIngredients> {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unreachable" });

    // 1. Get the approved storyboard frame
    const frameResult = await db.select().from(storyboardImages)
        .where(and(
            eq(storyboardImages.id, storyboardImageId),
            eq(storyboardImages.projectId, projectId)
        )).limit(1);

    const frame = frameResult[0];
    if (!frame) throw new TRPCError({ code: "NOT_FOUND", message: "Storyboard frame not found" });
    if (frame.status !== "approved" || !frame.masterImageUrl) {
        throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Frame must be approved and upscaled to 4K before shooting. Use storyboard.approveAndUpscaleFrame first."
        });
    }

    // 2. Try to find matching DB shot by shotNumber
    const sceneList = await db.select().from(scenes)
        .where(eq(scenes.projectId, projectId))
        .orderBy(scenes.order);

    let matchedShot: typeof shots.$inferSelect | undefined;
    let globalIdx = 0;
    outerLoop: for (const scene of sceneList) {
        const shotList = await db.select().from(shots)
            .where(eq(shots.sceneId, scene.id))
            .orderBy(shots.order);
        for (const shot of shotList) {
            if (globalIdx === frame.shotNumber - 1) {
                matchedShot = shot;
                break outerLoop;
            }
            globalIdx++;
        }
    }

    // 3. Get character references
    const { characters } = await import("../../../../drizzle/schema");
    const allChars = await db.select().from(characters)
        .where(eq(characters.projectId, projectId));
    const characterReferenceUrls = allChars
        .map((c: typeof characters.$inferSelect) => c.imageUrl)
        .filter((url: string): url is string => !!url && url !== "draft");

    return {
        keyframeUrl: frame.masterImageUrl,
        cameraAngle: matchedShot?.cameraAngle ?? "Medium Shot",
        movement: matchedShot?.movement ?? "Static",
        lighting: matchedShot?.lighting ?? "Natural",
        lens: matchedShot?.lens ?? "35mm",
        visualDescription: matchedShot?.visualDescription ?? frame.prompt ?? "",
        audioDescription: matchedShot?.audioDescription ?? undefined,
        characterReferenceUrls,
    };
}
