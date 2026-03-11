const fs = require('fs');
const path = require('path');

function walk(dir) {
    return fs.readdirSync(dir).flatMap(f => {
        const p = path.join(dir, f);
        return fs.statSync(p).isDirectory() ? walk(p) : [p];
    });
}

const files = walk('client/src').filter(f => f.endsWith('.tsx'));

const checks = [
    { usage: '<Button', importPattern: /import[^;]*Button[^;]*from/ },
    { usage: '<Textarea', importPattern: /import[^;]*Textarea[^;]*from/ },
    { usage: 'useState(', importPattern: /import[^;]*(useState|from 'react')[^;]*from|from "react"/ },
];

files.forEach(f => {
    const c = fs.readFileSync(f, 'utf8');
    checks.forEach(({ usage, importPattern }) => {
        if (c.includes(usage) && !importPattern.test(c)) {
            console.log(`MISSING import for "${usage}" in: ${f}`);
        }
    });
});

console.log('Scan complete.');
