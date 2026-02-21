
import * as characterConsistency from "../server/services/characterConsistency";

async function validatePromptEngineering() {
    console.log("🕵️ VALIDATING CINEMATIC PROMPT ENGINEERING (LOCAL)...");

    // 1. CHARACTER & SCENE DATA
    const characterName = "Eleanor";
    const characterDescription = "A mysterious spy in her late 30s, sharp jawline, piercing emerald eyes, high-collared emerald green silk dress, dark hair in a sleek bun.";
    const visualStyle = "Cinematic Noir with deep shadows and velvet textures.";
    const shot = {
        shot: 1,
        tipo_plano: "Tight Close-up",
        accion: "Eleanor subtly adjusts her gold earring while looking into a silver mirror.",
        intencion: "To show her composure before the heist."
    };

    // 2. REPLICATING SYSTEM PROMPT LOGIC FROM aiGeneration.ts
    const systemPrompt = `You are a world-class Cinematic Director and Visual Concept Artist. 
Your task is to translate film shots into hyper-detailed, technical image generation prompts.

CRITICAL DIRECTIVES:
1. USE TECHNICAL VERBIAGE: Mention specific lenses (e.g., Anamorphic, 35mm, 85mm), lighting setups (e.g., Rembrandt, Volumetric, High-key), and camera tech (e.g., ARRI Alexa, 8K RAW).
2. VISUAL TEXTURE: Describe textures vividly - skin pores, fabric weaves, atmospheric dust, lens flares.
3. COLOR MANIPULATION: Use the visual style guide to define specific color grades (e.g., "Teal and Orange highlights with crushed blacks").
4. SUBJECT ANCHORING: If a character persona is provided, ensure their features are the absolute focal point.
5. COMPOSITION: Describe the framing with precision (e.g., "Golden ratio composition", "Rule of thirds", "Low-angle heroic shot").`;

    const userContent = `Shot Breakdown:
- Shot No: ${shot.shot}
- Framing: ${shot.tipo_plano}
- Narrative Action: ${shot.accion}
- Emotional Intent: ${shot.intencion}

Master Visual Style Guide:
${visualStyle}

LOCKED CHARACTER (VISUAL ANCHOR):
${characterName}: ${characterDescription}

Construct a technical, highly descriptive cinematic image prompt based on these parameters.`;

    console.log("\n--- [INTERNAL DATA] SYTEM PROMPT ---");
    console.log(systemPrompt);
    console.log("\n--- [INTERNAL DATA] USER PARAMETERS ---");
    console.log(userContent);

    // 3. TESTING VARIATION LOGIC (This is already functional)
    console.log("\n--- [OUTPUT] CHARACTER CONSISTENCY VARIATION PROTOCOL ---");
    const mockBasePrompt = "A cinematic shot of Eleanor in a ballroom.";
    const variationPrompt = characterConsistency.generateVariationPrompt(
        mockBasePrompt,
        { [characterName]: characterDescription },
        0 // Low-angle hero shot
    );

    console.log(variationPrompt);

    console.log("\n✅ VERIFICATION COMPLETE:");
    if (variationPrompt.includes("[VARIATION PROTOCOL]") && variationPrompt.includes("MANDATORY: All character facial features")) {
        console.log("- Character Continuity Enforcement: ACTIVE");
    }
    if (variationPrompt.includes("Arri Alexa 65, 8k RAW")) {
        console.log("- High-End Cinematic Tech: ACTIVE");
    }
}

validatePromptEngineering();
