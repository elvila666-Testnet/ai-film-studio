
import "dotenv/config";
import { getDb } from "../server/db";
import { modelConfigs } from "../drizzle/schema";

async function main() {
    try {
        const db = await getDb();
        const configs = await db.select().from(modelConfigs);
        console.log("Model Configs Count:", configs.length);
        configs.forEach(c => {
            console.log(`- ${c.provider} (${c.modelId}): isActive=${c.isActive}, hasKey=${!!c.apiKey}`);
        });
    } catch (err) {
        console.error("Error checking configs:", err);
    }
    process.exit(0);
}

main();
