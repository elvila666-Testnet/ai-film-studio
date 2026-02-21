const fs = require('fs');

const files = [
    'd:/ai-film-studio/server/routers/editorRouter.ts',
    'd:/ai-film-studio/server/routers/aiRouter.ts'
];

for (const f of files) {
    let code = fs.readFileSync(f, 'utf8');
    code = code.replace(/import\("\.\.\/drizzle\/schema"\)/g, 'import("../../drizzle/schema")');
    fs.writeFileSync(f, code);
}
console.log('Fixed imports');
