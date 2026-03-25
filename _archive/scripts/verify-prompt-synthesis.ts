import { generateStoryboardGridPrompt } from "./server/services/storyboardGrid";

const mockShots = [
    { shot: 1, accion: "Mariles riding a horse in the desert", intencion: "Heroic introduction", tipo_plano: "Wide Shot" },
    { shot: 2, accion: "Close up of Mariles' face as he stares at the sun", intencion: "Determination", tipo_plano: "Close-Up" },
    { shot: 3, accion: "Presi and Mariles shaking hands", intencion: "Camaraderie", tipo_plano: "Medium Shot" },
];

const prompt = generateStoryboardGridPrompt(mockShots, "Use vintage desert colors.");

console.log("--- GENERATED GRID PROMPT ---");
console.log(prompt);

if (prompt.includes("3x4 storyboard grid") &&
    prompt.includes("Arri Alexa 35") &&
    prompt.includes("HARD CHARACTER LOCK") &&
    prompt.includes("Presi and Mariles")) {
    console.log("\n✅ Prompt synthesis verification PASSED");
} else {
    console.error("\n❌ Prompt synthesis verification FAILED");
    process.exit(1);
}
