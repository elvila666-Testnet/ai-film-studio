const fs = require('fs');
const filePath = 'd:/ai-film-studio/server/routers.ts';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split(/\r?\n/);

const startIdx = lines.findIndex(l => l.includes('storyboard: storyboardRouter,//'));
const endIdx = lines.findIndex((l, idx) => idx > startIdx && l.trim() === '}),' && lines[idx - 1] && lines[idx - 1].includes('return { success: true, results };'));

if (startIdx !== -1 && endIdx !== -1) {
    // Replace the block with just the storyboard key
    lines.splice(startIdx, endIdx - startIdx + 1, '  storyboard: storyboardRouter,');
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('Fixed routers.ts lines ', startIdx, endIdx);
} else {
    console.log('Could not find boundaries');
}
