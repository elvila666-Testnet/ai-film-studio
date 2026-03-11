import { ENV } from './server/_core/env.js';

async function run() {
    try {
        const key = ENV.geminiApiKey;
        if (!key) throw new Error("No Gemini API key");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        console.log(JSON.stringify(data.models.filter(m => m.name.includes("imagen") || m.name.includes("vision") || m.name.includes("generate")), null, 2));
    } catch (err) {
        console.error(err);
    }
}

run();
