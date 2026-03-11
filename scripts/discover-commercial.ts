import dotenv from "dotenv";
dotenv.config();

async function main() {
    const projectId = 16;
    console.log("Loading services...");
    const { getDb, projectContent, characters } = await import("../server/db");
    const { invokeLLM } = await import("../server/_core/llm");
    const { eq } = await import("drizzle-orm");

    const db = await getDb();
    if (!db) throw new Error("DB unreachable");

    const contentResult = await db.select().from(projectContent).where(eq(projectContent.projectId, projectId)).limit(1);
    const scriptText = contentResult[0]?.script;

    if (!scriptText) {
        console.error("No script found");
        process.exit(1);
    }

    console.log("Extracting principal characters...");
    const llmResponse = await invokeLLM({
        messages: [
            {
                role: "system",
                content: `You are a casting director. Extract principal characters from a screenplay. Return ONLY a JSON array, no other text.`,
            },
            {
                role: "user",
                content: `Extract principal characters from this screenplay.
        
        SCRIPT:
        ${scriptText.substring(0, 4000)}
        
        Response format (ONLY JSON):
        [{"name":"Character Name","description":"Age, build, facial features, wardrobe, distinctive visual traits"}]`,
            },
        ],
        responseFormat: { type: "json_object" },
    });

    const rawContent = llmResponse.choices?.[0]?.message?.content;
    let responseText = "";
    if (typeof rawContent === "string") {
        responseText = rawContent.trim();
    } else {
        responseText = JSON.stringify(rawContent);
    }

    // Handle markdown block
    if (responseText.includes("```json")) {
        responseText = responseText.split("```json")[1].split("```")[0].trim();
    } else if (responseText.includes("```")) {
        responseText = responseText.split("```")[1].split("```")[0].trim();
    }

    const extracted = JSON.parse(responseText);
    const list = Array.isArray(extracted) ? extracted : (extracted.characters || []);

    console.log(`Found ${list.length} characters.`);

    for (const char of list) {
        console.log(`Creating character: ${char.name}...`);
        await db.insert(characters).values({
            projectId,
            name: char.name,
            description: char.description,
            status: 'draft',
            imageUrl: 'draft', // User will need to generate image
            isLocked: false
        });
    }

    console.log("Success! Characters discovered.");
}

main().catch(console.error);
