import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    const apiKey = process.env.BUILT_IN_FORGE_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY; // or maybe forge is proxying?
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            data.models.forEach((m) => {
                if (m.name.includes('imagen')) {
                    console.log(m.name, m.supportedGenerationMethods);
                }
            });
        }
        else {
            console.log(data);
        }
    } catch (e) {
        console.error(e);
    }
}
listModels();
