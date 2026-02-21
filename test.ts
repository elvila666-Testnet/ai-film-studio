import { testDbConnection } from "./server/db";
import { generateCharacterNano } from "./server/services/aiGeneration";

async function run() {
    await testDbConnection();
    console.log("DB connected");
}
run();
