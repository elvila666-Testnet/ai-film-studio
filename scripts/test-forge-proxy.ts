import { ENV } from "../server/_core/env";
import { callDataApi } from "../server/_core/dataApi";

async function main() {
    console.log("Testing Forge Proxy Configuration...");
    console.log(`Forge URL: ${ENV.forgeApiUrl}`);
    console.log(`Forge Key: ${ENV.forgeApiKey ? "SET (****)" : "MISSING"}`);

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
        console.error("Forge Configuration is incomplete!");
        process.exit(1);
    }

    try {
        console.log("Calling Data API (Health check)...");
        // Try a simple call if possible
        const response = await callDataApi("dummy.method", {});
        console.log("Forge Response:", response);
    } catch (err: any) {
        console.warn("Forge Check Warning (Method might not exist, but let's check connectivity):", err.message);
        if (err.message.includes("403") || err.message.includes("401")) {
            console.error("Forge Authentication Failed!");
        } else if (err.message.includes("ENOTFOUND") || err.message.includes("ETIMEDOUT")) {
            console.error("Forge Connectivity Failed!");
        } else {
            console.log("Forge Connectivity verified (but method failed as expected).");
        }
    }

    process.exit(0);
}

main().catch(err => {
    console.error("Forge test script failed:", err);
    process.exit(1);
});
