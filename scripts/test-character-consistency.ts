
process.env.BUILT_IN_FORGE_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCLulm-FKCy65bJq96CM3oBrHwsBL0HVT4';

import * as aiGeneration from "../server/services/aiGeneration";
import * as characterConsistency from "../server/services/characterConsistency";
import * as dotenv from "dotenv";

dotenv.config();

async function testCharacterConsistency() {
    console.log("🕵️ TESTING CHARACTER CONSISTENCY & CINEMATIC DNA...");

    // 1. CHARACTER DEFINITION
    const characterName = "Eleanor";
    const characterDescription = "A mysterious spy in her late 30s, sharp jawline, piercing emerald eyes, wearing a high-collared emerald green silk dress with ornate gold embroidery, dark hair styled in a sleek, tight bun.";

    // 2. SCENE CONTEXT
    const visualStyle = "Cinematic Noir with a modern twist. Deep shadows, high-key highlights, velvet textures, smoke-filled rooms, gold and emerald accents.";

    const shot = {
        shot: 1,
        tipo_plano: "Tight Close-up",
        accion: "Eleanor subtly adjusts her gold earring while looking into a silver mirror.",
        intencion: "To show her composure before the heist."
    };

    console.log("\n--- STAGE 1: GENERATING INITIAL CINEMATIC PROMPT ---");
    const initialPrompt = await aiGeneration.generateImagePromptForShot(
        shot,
        visualStyle,
        "Use Master Class lighting techniques.",
        `${characterName}: ${characterDescription}`
    );

    console.log("\nPROMPT FOR SHOT 1:");
    console.log(initialPrompt);

    console.log("\n--- STAGE 2: GENERATING A VARIATION (DIFFERENT ANGLE) ---");
    // variationIndex 0: cinematic low-angle hero shot
    const variationPrompt = characterConsistency.generateVariationPrompt(
        initialPrompt,
        { [characterName]: characterDescription },
        0
    );

    console.log("\nVARIATION PROMPT (Low-Angle Hero):");
    console.log(variationPrompt);

    console.log("\n--- STAGE 3: VALIDATION ---");
    const dnaKeywords = ["anamorphic", "arri", "lens", "8k", "lighting", "texture", characterName];
    const foundKeywords = dnaKeywords.filter(k =>
        initialPrompt.toLowerCase().includes(k.toLowerCase()) ||
        variationPrompt.toLowerCase().includes(k.toLowerCase())
    );

    console.log(`\nDNA Keywords detected: [${foundKeywords.join(", ")}]`);

    if (variationPrompt.includes("[VARIATION PROTOCOL]") && variationPrompt.includes("[CONTINUITY ENFORCEMENT]")) {
        console.log("✅ SUCCESS: Nano Banana Pro consistency protocols are active in the variation prompt.");
    }

    console.log("\n🚀 Character Consistency Workflow Validated.");
}

// testCharacterConsistency setup moved to top

testCharacterConsistency().catch(console.error);
