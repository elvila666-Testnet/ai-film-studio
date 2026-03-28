import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { generateGridImage } from "../services/aiGeneration";
import { getProjectContent, saveStoryboardImage, getLockedCharacter, getDb } from "../db";
import { estimateCost } from "../services/pricingService";
import { logUsage } from "../services/ledgerService";
import { productionDesignSets } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const storyboardAgentRouter = router({
    autoStoryboardScene: protectedProcedure
        .input(z.object({
            projectId: z.number(),
            sceneText: z.string()
        }))
        .mutation(async ({ input, ctx }) => {
            if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

            const content = await getProjectContent(input.projectId);
            const globalNotes = content?.globalDirectorNotes || "";
            const visualStyle = content?.visualStyle || "Cinematic";

            const lockedChar = await getLockedCharacter(input.projectId);
            const characterReferenceUrl = lockedChar ? lockedChar.imageUrl : undefined;

            // Retrieve set reference images from Art Department
            const db = await getDb();
            const projectSets = await db.select().from(productionDesignSets).where(eq(productionDesignSets.projectId, input.projectId));
            const setMap = projectSets.reduce((acc: any, set: any) => {
                acc[set.name.toLowerCase()] = set.imageUrl || set.referenceImageUrl;
                return acc;
            }, {});

            // Get the technical breakdown to match shots to sets
            const technicalShots = content?.technicalShots ? JSON.parse(content.technicalShots) : null;
            const technicalShotsList = technicalShots?.scenes?.flatMap((s: any) => s.shots) || [];

            // Stage 1: Parse the scene text into exactly 12 panels
            const prompt = `You are a professional storyboard artist. Take the following narrative scene and break it down into exactly 12 consecutive visual shots to form a 3x4 storyboard grid.

Scene: \n${input.sceneText}\n\n
Global Director Notes: ${globalNotes}
Visual Style: ${visualStyle}

TECHNICAL BREAKDOWN REFERENCE (Follow this order exactly):
${technicalShotsList.map((s: any) => `Shot ${s.shotNumber}: ${s.visualDescription} (Set: ${s.productionDesignNotes || 'Unknown'})`).join('\n')}

AVAILABLE SETS FOR REFERENCE:
${projectSets.map((s: any) => `- ${s.name}: ${s.description}`).join('\n')}

Output JSON ONLY in exactly this schema:
{
  "shots": [
    {
      "frameNumber": <number 1 to 12>,
      "cameraAngle": "e.g. Wide Establishing Shot",
      "action": "Description of the visual action",
      "assignedSet": "Exact name of the set from the list above"
    }
  ]
}
The array MUST contain exactly 12 items. Make the actions direct, simple, and clear.`;

            console.log(`[StoryboardAgent] Analyzing scene for Project ${input.projectId}...`);
            const llmResult = await invokeLLM({
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            });
            const llmCost = estimateCost('gemini-1.5-flash', 1);
            await logUsage(input.projectId, ctx.user.id.toString(), 'gemini-1.5-flash', llmCost, 'AGENT_SCENE_BREAKDOWN');

            let parsed: { shots: Array<{ frameNumber: number; cameraAngle: string; action: string; assignedSet?: string }> };
            try {
                parsed = JSON.parse(llmResult.choices[0].message.content as string);
                if (!parsed.shots || !Array.isArray(parsed.shots)) {
                    throw new Error("Invalid output format from LLM");
                }
            } catch (error) {
                console.error("[StoryboardAgent] Failed to parse generated shots:", error);
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to break down scene into 12 shots" });
            }

            console.log(`[StoryboardAgent] Successfully generated ${parsed.shots.length} shots. Assembling Generic Storyboard Prompt...`);

            // Assemble the final prompt with INDUSTRIAL CONTACT SHEET SPECIFICATIONS
            let masterPrompt = `
[STRICT INDUSTRIAL CONTACT SHEET ARCHITECTURE]
Generate a SINGLE high-fidelity 16:9 image containing a RIGID 3×4 STORYBOARD GRID.
The grid MUST consist of EXACTLY 12 IDENTICAL RECTANGULAR PANELS arranged in 3 rows and 4 columns.

[GEOMETRIC CONSTRAINTS - NON-NEGOTIABLE]
- GRID LAYOUT: 3 columns across, 4 rows down.
- CELL SYMMETRY: Every single cell MUST have the EXACT SAME dimensions.
- ASPECT RATIO: Each individual cell MUST be a perfect 16:9 cinematic frame.
- CANVAS: The entire grid must be contained within a single 4:3 aspect ratio canvas.

[INTEGRATED TECHNICAL LABELS]
- MANDATORY: Render a small, legible text label in the BOTTOM-LEFT corner of EVERY cell.
- LABEL FORMAT: "SHOT 1", "SHOT 2", "SHOT 3" ... up to "SHOT 12".
- LABEL STYLE: White sans-serif text with a subtle black outline for readability.

[PANEL SEQUENCE & CONTENT]
`;

            // Pick a representative set image (the one most frequently assigned in the 12 shots)
            const setCounts: Record<string, number> = {};
            parsed.shots.forEach(s => {
                if (s.assignedSet) {
                    const name = s.assignedSet.toLowerCase();
                    setCounts[name] = (setCounts[name] || 0) + 1;
                }
            });
            const mostFrequentSetName = Object.keys(setCounts).reduce((a, b) => setCounts[a] > setCounts[b] ? a : b, "");
            const setReferenceUrl = setMap[mostFrequentSetName];

            parsed.shots.forEach((s, index) => {
                const shotNum = index + 1;
                masterPrompt += `PANEL ${shotNum} (Row ${Math.floor(index/3)+1}, Col ${(index%3)+1}): [${s.cameraAngle}] - ${s.action}${s.assignedSet ? ` (Set: ${s.assignedSet})` : ""}. Label this cell as "SHOT ${shotNum}".\n`;
            });

            // Build detailed visual descriptions from character and set references
            let characterVisualDescription = "";
            if (lockedChar) {
                characterVisualDescription = `
CHARACTER IDENTITY LOCK:
- Name: ${lockedChar.name || 'Protagonist'}
- Physical Description: ${lockedChar.description || 'Professional athlete in extreme conditions'}
- Key Visual Markers: Maintain exact appearance across all 12 panels. Same facial features, build, and distinctive characteristics.
- Wardrobe: ${lockedChar.wardrobe || 'Technical expedition gear'}`;
            }

            let setVisualDescription = "";
            if (projectSets.length > 0) {
                setVisualDescription = `
SET ENVIRONMENT ANCHORS:
${projectSets.map((s: any) => `- ${s.name}: ${s.description}`).join('\n')}`;
            }

            masterPrompt += `
[VISUAL CONSISTENCY & STYLE]
- Character: Maintain 100% identity lock for all characters across all 12 panels.${characterVisualDescription}
- Environment: Ground all compositions in the assigned set environments. Respect architectural, material, and atmospheric qualities.${setVisualDescription}
- Lighting/Color: Apply consistent ${visualStyle} grade and lighting scheme to entire sheet.
- Composition: Center-weighted compositions for each cell.
- CONSISTENCY RULE: Every character appearance must be identical across all 12 panels. Every environment must match its assigned set.
- FINAL OUTPUT: A single, professionally organized 1792x1024 technical storyboard sheet.`

            // We offload generation so we don't block the UI
            (async () => {
                const uniqueShotNumber = 1000 + Math.floor(Math.random() * 10000); // 1000+ maps to grid paginated pages
                try {
                    console.log(`[StoryboardAgent] Triggering 3x4 Grid Generation...`);
                    // NOTE: We pass characterReferenceUrl and setReferenceUrl for logging/tracking,
                    // but the actual visual consistency is enforced via detailed prompt descriptions.
                    const imageUrl = await generateGridImage(
                        masterPrompt, 
                        input.projectId, 
                        ctx.user.id.toString(), 
                        1, 
                        [characterReferenceUrl, setReferenceUrl].filter(Boolean) as string[]
                    );
                    await saveStoryboardImage(input.projectId, uniqueShotNumber, imageUrl, masterPrompt);
                    console.log(`[StoryboardAgent] Grid Materialized -> ${imageUrl}`);
                } catch (err) {
                    console.error(`[StoryboardAgent] Grid generation failed:`, err);
                }
            })();

            return {
                success: true,
                message: "Auto-storyboarding initialized. 12-panel Grid will materialize shortly.",
                estimatedShots: 12
            };
        })
});
