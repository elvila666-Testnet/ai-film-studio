/**
 * Autonomous Creative Audit Orchestrator
 * Executes the full Studio pipeline for a complex prompt and triggers the audit.
 */

import "dotenv/config";
import { getDb } from "../server/db.ts";
import { createProject } from "../server/db/projects.ts";
import { breakupScriptToScenes, breakupSceneToShots } from "../server/services/aiOrchestrator.ts";
import { generations, scenes, shots, projects } from "../drizzle/schema.ts";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function runAudit() {
    console.log("🚀 Starting Autonomous Creative Audit Protocol...");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sessionDir = path.join(process.cwd(), `test_session_${timestamp}`);
    fs.mkdirSync(sessionDir);

    const db = await getDb();
    if (!db) {
        console.error("❌ Database not available");
        process.exit(1);
    }

    // 1. Setup User Persona and Prompt
    const originalPrompt = "Cyberpunk Noir: A futuristic detective in a rain-soaked neon alleyway, wearing a glowing holographic trench coat, investigating a glowing data-shard embedded in a trash-heap. High technical complexity: volumetic fog, reflections, and deep shadows.";

    // 2. Create Project
    console.log("📁 Creating project...");
    const projectId = await createProject(1, `Audit Session ${timestamp}`); // Assuming User ID 1 exists
    console.log(`✅ Project created with ID: ${projectId}`);

    // 3. Script Breakdown
    console.log("📝 Breaking down script to scenes...");
    await breakupScriptToScenes(projectId, originalPrompt, "1");
    const sceneResult = await db.select().from(scenes).where(eq(scenes.projectId, projectId)).limit(1);
    const scene = sceneResult[0];

    if (!scene) {
        console.error("❌ Failed to generate scenes");
        process.exit(1);
    }

    // 4. Shot Breakdown
    console.log(`🎬 Generating shots for Scene: ${scene.title}...`);
    const techShots = await breakupSceneToShots(scene.id, "1");
    console.log(`✅ Generated ${techShots.length} shots.`);

    // 5. Image Generation (First shot for audit)
    console.log("🖼️ Generating storyboard image for first shot...");
    const shotResult = await db.select().from(shots).where(eq(shots.sceneId, scene.id)).orderBy(shots.order).limit(1);
    const shot = shotResult[0];

    if (!shot) {
        console.error("❌ Failed to generate shots in DB");
        process.exit(1);
    }

    // Orchestrate generateShotImage call manually since we are in script
    const { generateImagePromptForShot, generateStoryboardImage } = await import("../server/services/aiGeneration.ts");

    const promptInput = {
        shot: shot.order,
        tipo_plano: shot.cameraAngle || "Medium Shot",
        movimiento: shot.movement || "Static",
        tecnica: shot.lens || "Cinematic",
        iluminacion: shot.lighting || "Natural",
        audio: shot.audioDescription || "Ambient",
        accion: shot.visualDescription || "Action",
        intencion: "Audit match"
    };

    const expandedPrompt = await generateImagePromptForShot(promptInput, "Cyberpunk Noir, high contrast, neon lighting", undefined, "");
    console.log("🔍 Director Expanded Prompt:", expandedPrompt);

    const imageUrl = await generateStoryboardImage(expandedPrompt, "Flux", projectId, "1");
    console.log(`✅ Image generated: ${imageUrl}`);

    // 6. Visual Analysis (Simulated or using Vision if available, for now simple placeholder)
    const visualAnalysis = `The image shows a futuristic detective in a rain-soaked alley. The holographic trench coat glows with cyan light. A data shard is visible. Reflections are present in puddles.`;

    // 7. Run Python Audit Tool
    console.log("📊 Running audit tool...");
    const scriptPath = path.join(process.cwd(), ".agent", "skills", "creative-validator", "process_audit.py");

    try {
        const cmd = `python "${scriptPath}" "${originalPrompt}" "${expandedPrompt.replace(/"/g, '\\"')}" "${visualAnalysis}"`;
        execSync(cmd);

        // Move report to session dir
        if (fs.existsSync("COO_REPORT.md")) {
            fs.renameSync("COO_REPORT.md", path.join(sessionDir, "COO_REPORT.md"));
            console.log(`✅ Audit report ready in: ${sessionDir}`);
        }
    } catch (err) {
        console.error("❌ Failed to run audit tool:", err);
    }

    console.log("🏁 Protocol complete.");
}

runAudit().catch(console.error);
