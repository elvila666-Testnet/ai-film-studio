import fs from 'fs';

async function run() {
    try {
        const envData = fs.readFileSync('.env', 'utf8');
        const match = envData.match(/BUILT_IN_FORGE_API_KEY="?([^"\n]+)"?/);
        if (!match) throw new Error("No Gemini API key found");
        const key = match[1];

        const p = "a ".repeat(1500); // Create a giant prompt string
        console.log("Sending payload...");
        const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict?key=${key}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instances: [{ prompt: p }], parameters: { sampleCount: 1, aspectRatio: "16:9" } })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`API Error (${response.status}): ${errText}`);
        } else {
            const data = await response.json();
            console.log("Success! Data keys:", Object.keys(data));
        }
    } catch (err) {
        console.error(err);
    }
}

run();
