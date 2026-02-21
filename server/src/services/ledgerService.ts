import { getDb } from "../../db";
import { usageLedger } from "../../../drizzle/schema";

export async function logUsage(
    projectId: number,
    userId: string,
    modelId: string,
    cost: number,
    actionType: string,
    quantity: number = 1
) {
    const db = await getDb();
    if (!db) {
        console.error("Failed to log usage: Database unreachable");
        return;
    }

    try {
        await db.insert(usageLedger).values({
            projectId,
            userId,
            actionType,
            modelId,
            quantity,
            cost: cost.toString(),
        });
        console.log(`[Ledger] Logged: ${actionType} | $${cost.toFixed(4)} | Project: ${projectId}`);
    } catch (error) {
        console.error("Failed to log usage:", error);
        // Don't throw, we don't want to fail the generation if logging fails (unless strict mode)
    }
}
