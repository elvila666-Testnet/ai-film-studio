import dotenv from 'dotenv';
dotenv.config();
import { generateStoryboardImage } from './services/aiGeneration.js';

async function run() {
    try {
        console.log("Testing generation...");
        // This will route to geminiProvider which we updated to 001
        const url = await generateStoryboardImage("A cinematic shot of a glowing orb", "nanobana-2.0", 1, "test-user");
        console.log("SUCCESS! URL:", url);
    } catch (e) {
        console.error("FAILED:", e);
    }
}
run();
