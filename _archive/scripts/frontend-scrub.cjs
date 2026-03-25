const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const stat = fs.statSync(path.join(dir, file));
        if (stat.isDirectory()) {
            walk(path.join(dir, file), fileList);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            fileList.push(path.join(dir, file));
        }
    }
    return fileList;
}

const files = walk('d:/ai-film-studio/client/src');
let changedAny = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    let original = content;

    // Simple and safe replacements for `: any` in React/TS codebase
    // Usually it's in props or catch blocks
    content = content.replace(/catch \(error: any\)/g, 'catch (error: unknown)');
    content = content.replace(/\(e: any\)/g, '(e: React.ChangeEvent<any>)');

    // replace some generic usages
    content = content.replace(/: any/g, ': unknown');
    // Revert the generic e: React.ChangeEvent<any> which might have been changed
    content = content.replace(/: React.ChangeEvent<unknown>/g, ': React.ChangeEvent<HTMLInputElement>');
    content = content.replace(/import { any }/g, 'import { unknown }'); // Edge cases

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf-8');
        changedAny++;
        console.log(`Updated anys in ${file}`);
    }
}

console.log(`Replaced 'any' in ${changedAny} files`);

// Also scrub Provider references
const brandDashboard = 'd:/ai-film-studio/client/src/pages/BrandDashboard.tsx';
if (fs.existsSync(brandDashboard)) {
    let bd = fs.readFileSync(brandDashboard, 'utf-8');
    bd = bd.replace(/Point Gemini to your digital ecosystem/g, 'Point our AI analysis to your digital ecosystem');
    fs.writeFileSync(brandDashboard, bd);
}

const costGuard = 'd:/ai-film-studio/client/src/components/FinOps/CostGuard.tsx';
if (fs.existsSync(costGuard)) {
    let cg = fs.readFileSync(costGuard, 'utf-8');
    cg = cg.replace(/Replicate account/g, 'connected AI provider account');
    fs.writeFileSync(costGuard, cg);
}

const advanced = 'd:/ai-film-studio/client/src/components/AdvancedSettingsPanel.tsx';
if (fs.existsSync(advanced)) {
    let ad = fs.readFileSync(advanced, 'utf-8');
    ad = ad.replace(/Replicate/g, 'AI Provider');
    fs.writeFileSync(advanced, ad);
}

const home = 'd:/ai-film-studio/client/src/pages/Home.tsx';
if (fs.existsSync(home)) {
    let hm = fs.readFileSync(home, 'utf-8');
    hm = hm.replace(/via Replicate/g, 'via AI Engine');
    fs.writeFileSync(home, hm);
}
