const fs = require('fs');
const path = require('path');

const routersDir = path.join('d:', 'ai-film-studio', 'server', 'routers');
const files = ['aiRouter.ts', 'referenceImagesRouter.ts', 'editorRouter.ts', 'charactersRouter.ts'];

for (const file of files) {
    const filePath = path.join(routersDir, file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf-8');

    // Fix dynamic imports
    content = content.replace(/await import\("\.\//g, 'await import("../');

    // Fix db imports that were not dynamic
    // but wait, in aiRouter, are there static db imports?

    // Also fix missing functions that were imported at the top of routers.ts
    // Instead of static imports, let's just make sure they all compile.
    // Actually, the errors shown for referenceImagesRouter:
    // Cannot find name 'getReferenceImages'

    // That means referenceImagesRouter was relying on static imports from db.ts
    content = `import { 
  getReferenceImages, saveReferenceImage, deleteReferenceImage,
  createEditorProject, getEditorProjectsByProjectId, getEditorClips, createEditorClip, updateEditorClip, deleteEditorClip, createEditorTrack, getEditorTracks, createEditorExport, getEditorExports, updateEditorExport, createComment, getClipComments, updateComment, deleteComment, getAnimaticConfig, updateFrameDurations, updateAnimaticAudio, getStoryboardFrameOrder, updateFrameOrder, getFrameHistory, createFrameHistoryVersion, getFrameNotes, saveFrameNotes, deleteFrameNotes,
  createCharacter, getCharacter, getProjectCharacters, getLockedCharacter, lockCharacter, unlockAllCharacters, updateCharacter, deleteCharacter
} from "../db";\n` + content;

    // Fix trailing comma at the end
    content = content.replace(/}\),\n$/g, '});\n');
    content = content.replace(/}\),\n\n$/g, '});\n');

    fs.writeFileSync(filePath, content);
}

// Also fix routers.ts storyboard import
const routersTsPath = path.join('d:', 'ai-film-studio', 'server', 'routers.ts');
let routersTs = fs.readFileSync(routersTsPath, 'utf-8');
if (!routersTs.includes('import { storyboardRouter }')) {
    routersTs = `import { storyboardRouter } from "./routers/storyboardRouter";\n` + routersTs;
    routersTs = routersTs.replace('storyboard: router({', 'storyboard: storyboardRouter,//');
    fs.writeFileSync(routersTsPath, routersTs);
}

console.log("Fixes applied");
