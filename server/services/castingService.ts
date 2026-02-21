
import Replicate from "replicate";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { actors, usageLedger } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const replicate = new Replicate({ auth: ENV.replicateApiKey });

export async function trainCharacterModel(
    userId: string,
    projectId: number,
    name: string,
    triggerWord: string,
    zipUrl: string
) {
    const db = await getDb();
    if (!db) throw new Error("DB unreachable");

    console.log(`[Casting] Starting training for ${name} (User: ${userId})`);

    // 1. Create Actor Entry in DB
    const [result] = await db.insert(actors).values({
        userId: parseInt(userId),
        name,
        triggerWord,
        status: "training",
        zipUrl,
        // loraId and trainingId update later
    });
    const actorId = result.insertId;

    try {
        // 2. Determine Destination
        // We attempt to get the username from the API key account, or use a default.
        let owner = "ai-film-studio";
        try {
            const account = await replicate.account.get();
            owner = account.username;
        } catch (e) {
            console.warn("Could not fetch Replicate account info, using default owner:", owner);
        }

        const modelName = `char-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
        const destination = `${owner}/${modelName}`;

        console.log(`[Casting] Training destination: ${destination}`);

        // 3. Start Training (Flux Dev LoRA)
        // Trainer: ostris/flux-dev-lora-trainer
        const training = await replicate.trainings.create(
            "ostris",
            "flux-dev-lora-trainer", // Model owner/name
            "e440909d3512c31646ee2e0c7d6f6f4d234e850e2127db8a1d24272f29f0003a", // Version
            {
                destination: destination,
                input: {
                    steps: 1000,
                    lora_rank: 16,
                    optimizer: "adamw8bit",
                    batch_size: 1,
                    resolution: "512,768,1024",
                    autocaption: true,
                    input_images: zipUrl,
                    trigger_word: triggerWord
                }
            } as any
        );

        // 4. Update Actor Record
        await db.update(actors).set({
            trainingId: training.id,
            loraId: destination, // Pending success, but this is the target
            status: "training"
        }).where(eq(actors.id, actorId));

        // 5. Log Cost (Estimate)
        // Training is costly. We log it now.
        await db.insert(usageLedger).values({
            projectId,
            userId,
            actionType: "MODEL_TRAINING",
            modelId: "flux-dev-lora-trainer",
            quantity: 1,
            cost: "2.00" // Estimated $2.00
        });

        return { actorId, trainingId: training.id, status: "training" };

    } catch (error: unknown) {
        console.error("Training failed to start:", error);
        await db.update(actors).set({
            status: "failed",
        }).where(eq(actors.id, actorId)); // We don't save error message in schema?
        throw new Error(`Failed to start training: ${error.message}`);
    }
}

export async function checkActorStatus(actorId: number) {
    const db = await getDb();
    if (!db) throw new Error("DB unreachable");

    const actorResult = await db.select().from(actors).where(eq(actors.id, actorId)).limit(1);
    const actor = actorResult[0];

    if (!actor || !actor.trainingId) return null;

    if (actor.status === "ready" || actor.status === "failed") {
        return actor.status;
    }

    try {
        const training = await replicate.trainings.get(actor.trainingId);
        let newStatus = actor.status;

        if (training.status === "succeeded") newStatus = "ready";
        if (training.status === "failed" || training.status === "canceled") newStatus = "failed";

        if (newStatus !== actor.status) {
            await db.update(actors).set({
                status: newStatus
            }).where(eq(actors.id, actorId));
        }

        return newStatus;
    } catch (e) {
        console.error("Failed to check training status:", e);
        return actor.status;
    }
}
