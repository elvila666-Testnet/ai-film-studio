import fs from 'fs';

async function run() {
    try {
        const envData = fs.readFileSync('.env', 'utf8');
        const match = envData.match(/BUILT_IN_FORGE_API_KEY="?([^"\n]+)"?/);
        if (!match) throw new Error("No Gemini API key found");
        const key = match[1];

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        if (!data.models) {
            console.error("Error from API:", data);
            return;
        }
        const filtered = data.models.filter(m => m.name.includes("imagen") || m.name.includes("vision") || m.name.includes("generate"));
        console.log(JSON.stringify(filtered, null, 2));
    } catch (err) {
        console.error(err);
    }
}

run();
