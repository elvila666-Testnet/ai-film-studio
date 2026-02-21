import { logUsage } from "../server/src/services/ledgerService";
import { getDb } from "../server/db";
import { usageLedger } from "../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { estimateCost } from "../server/src/lib/pricing";

// Mock ENV for test
process.env.DATABASE_URL = "mysql://root:password@127.0.0.1:3306/ai_film_studio"; // Adjust if needed

async function testLedger() {
    console.log("🧪 Testing Usage Ledger...");

    const projectId = 1; // Assume project 1 exists
    const userId = "test-user-123";
    const modelId = "black-forest-labs/flux-pro";
    const cost = estimateCost(modelId, 1);

    console.log(`Expected Cost: $${cost}`);

    // 1. Log Usage directly
    await logUsage(projectId, userId, modelId, cost, "TEST_GEN");

    // 2. Verify in DB
    const db = await getDb();
    if (!db) throw new Error("DB unreachable");

    const entry = await db.select().from(usageLedger)
        .where(eq(usageLedger.userId, userId))
        .orderBy(desc(usageLedger.createdAt))
        .limit(1);

    if (entry.length > 0 && entry[0].actionType === "TEST_GEN") {
        console.log("✅ Success! Ledger entry found:");
        console.log(entry[0]);
    } else {
        console.error("❌ Failed! No ledger entry found.");
        process.exit(1);
    }

    process.exit(0);
}

testLedger();
