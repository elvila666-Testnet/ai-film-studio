import fs from 'fs';

async function run() {
    try {
        const envData = fs.readFileSync('.env', 'utf8');
        const match = envData.match(/BUILT_IN_FORGE_API_KEY="?([^"\n]+)"?/);
        if (!match) throw new Error("No Gemini API key found");
        const key = match[1];

        const modelId = "imagen-4.0-ultra-generate-001";
        const payload = {
            instances: [{ prompt: "A cinematic storyboard grid showing 4 panels" }],
            parameters: {
                sampleCount: 1,
                aspectRatio: "16:9", // Test cinematic aspect
                outputOptions: {
                    mimeType: "image/jpeg",
                }
            }
        };

        console.log("Sending payload...");
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predict?key=${key}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`API Error (${response.status}): ${errText}`);
        } else {
            const data = await response.json();
            console.log("Success! Data keys:", Object.keys(data));
            if (data.predictions && data.predictions.length > 0) {
                console.log("Got predictions!");
            }
        }
    } catch (err) {
        console.error(err);
    }
}

run();
