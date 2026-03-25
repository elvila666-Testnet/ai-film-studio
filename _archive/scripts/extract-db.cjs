const fs = require('fs');
const path = require('path');

const dbPath = path.join('d:', 'ai-film-studio', 'server', 'db.ts');
const dbDir = path.join('d:', 'ai-film-studio', 'server', 'db');

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}

let dbContent = fs.readFileSync(dbPath, 'utf-8');

const mapping = {
    users: ['upsertUser', 'getUserByOpenId', 'getUserByEmail'],
    projects: ['createProject', 'getUserProjects', 'getProject', 'getProjectContent', 'updateProjectContent', 'deleteProject', 'setProjectBrand'],
    storyboard: ['getStoryboardImages', 'saveStoryboardImage', 'updateStoryboardImageVideoUrl', 'getStoryboardImageById', 'saveStoryboardImageWithConsistency', 'getStoryboardImageWithConsistency', 'getProjectCharacterReference', 'getStoryboardFrameOrder', 'updateFrameOrder', 'getFrameHistory', 'createFrameHistoryVersion', 'getFrameNotes', 'saveFrameNotes', 'deleteFrameNotes', 'updateStoryboardVideo', 'deleteStoryboardVideo'],
    referenceImages: ['getReferenceImages', 'saveReferenceImage', 'deleteReferenceImage'],
    videos: ['getGeneratedVideos', 'createGeneratedVideo', 'updateGeneratedVideo'],
    editor: ['createEditorProject', 'getEditorProject', 'getEditorProjectsByProjectId', 'createEditorClip', 'getEditorClips', 'updateEditorClip', 'deleteEditorClip', 'createEditorTrack', 'getEditorTracks', 'createEditorExport', 'getEditorExports', 'updateEditorExport', 'createComment', 'getClipComments', 'updateComment', 'deleteComment'],
    animatic: ['getAnimaticConfig', 'saveAnimaticConfig', 'updateFrameDurations', 'updateAnimaticAudio'],
    brands: ['createBrand', 'getBrand', 'getUserBrands', 'updateBrand', 'deleteBrand'],
    characters: ['createCharacter', 'getCharacter', 'getProjectCharacters', 'getLockedCharacter', 'lockCharacter', 'unlockAllCharacters', 'updateCharacter', 'deleteCharacter'],
    models: ['getModelConfigs', 'getActiveModelConfig', 'upsertModelConfig', 'deleteModelConfig', 'setActiveModel', 'initializeModels', 'ensureActiveModels']
};

let remainingContent = dbContent;

for (const [moduleName, functionNames] of Object.entries(mapping)) {
    let moduleLines = [
        `import { eq, and, sql } from "drizzle-orm";`,
        `import { getDb } from "../db";`,
        `import * as schema from "../../drizzle/schema";`,
        `export * from "../../drizzle/schema";`, // temporary fix to allow destructuring of InsertUser etc
    ];

    // Actually we need to extract precisely

    let extractedSomething = false;

    for (const fn of functionNames) {
        const fnRegex = new RegExp(`export async function ${fn}\\([\\s\\S]*?\\n}`);
        const match = remainingContent.match(fnRegex);
        if (match) {
            // Fix schema references since schema imports might not be in the file directly
            // Better to extract exactly
            let fnBody = match[0];

            // We will lazily just append it
            moduleLines.push(fnBody);
            remainingContent = remainingContent.replace(fnRegex, '');
            extractedSomething = true;
        }
    }

    if (extractedSomething) {
        const outPath = path.join(dbDir, `${moduleName}.ts`);
        // Add all schema objects manually to the top just in case
        const importSchema = `import { users, projects, projectContent, storyboardImages, referenceImages, generatedVideos, editorProjects, editorClips, editorTracks, editorExports, editorComments, animaticConfigs, storyboardFrameOrder, storyboardFrameHistory, storyboardFrameNotes, modelConfigs, userModelFavorites, brands, characters, InsertUser, InsertProjectContent, InsertEditorProject, InsertEditorClip, InsertEditorTrack, InsertEditorExport, InsertEditorComment, InsertAnimaticConfig, InsertModelConfig, InsertUserModelFavorite } from "../../drizzle/schema";`;

        fs.writeFileSync(outPath, importSchema + "\n" + moduleLines.join('\n\n'));
    }
}

// Write the exports back
let facadeExports = Object.keys(mapping).map(m => `export * from "./db/${m}";`).join("\n");
remainingContent = remainingContent + "\n" + facadeExports + "\n";

fs.writeFileSync(dbPath, remainingContent);
console.log("DB Extraction Completed.");
