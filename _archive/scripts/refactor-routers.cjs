const fs = require("fs");
const path = require("path");

const routersPath = path.join("d:", "ai-film-studio", "server", "routers.ts");
let fileContent = fs.readFileSync(routersPath, "utf-8");

function extractRouter(name, startLineMarker, endLineMarker) {
    const lines = fileContent.split(/\r?\n/);
    const startIdx = lines.findIndex(l => l.includes(startLineMarker));
    if (startIdx === -1) return false;

    let braceCount = 0;
    let endIdx = -1;
    let foundStart = false;

    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '{') {
                braceCount++;
                foundStart = true;
            } else if (line[j] === '}') {
                braceCount--;
            }
        }
        if (foundStart && braceCount === 0) {
            if (line.includes("}),") || line.includes("})")) {
                endIdx = i;
                break;
            }
        }
    }

    if (endIdx === -1) return false;

    const contentLines = lines.slice(startIdx, endIdx + 1);
    const content = contentLines.join("\n");

    fileContent = fileContent.replace(content, `  ${name}: ${name}Router,`);

    const routerPath = path.join("d:", "ai-film-studio", "server", "routers", `${name}Router.ts`);

    // Wrap content into a standalone router
    let standaloneContent = `import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";

export const ${name}Router = router({
${contentLines.slice(1).join("\n")}
`;

    // Write new router file
    fs.writeFileSync(routerPath, standaloneContent);
    console.log(`Extracted ${name}Router: ${endIdx - startIdx + 1} lines`);

    return true;
}

const routersToExtract = [
    // { name: "storyboard", startMarker: "storyboard: router({" }, // Extracted manually
    { name: "ai", startMarker: "ai: router({" },
    { name: "referenceImages", startMarker: "referenceImages: router({" },
    { name: "editor", startMarker: "editor: router({" },
    { name: "characters", startMarker: "characters: router({" },
];

let extractedCount = 0;
for (const info of routersToExtract) {
    if (extractRouter(info.name, info.startMarker)) {
        extractedCount++;
    }
}

if (extractedCount > 0) {
    // Add imports
    const importLines = routersToExtract.map(info => `import { ${info.name}Router } from "./routers/${info.name}Router";`).join("\n");
    fileContent = importLines + "\n" + fileContent;

    fs.writeFileSync(routersPath, fileContent);
    console.log("Updated routers.ts successfully");
} else {
    console.log("No routers extracted. They might have been already extracted or markers not found.");
}
