import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
    "server/src/services/pricingService.ts",
    "server/services/providers/geminiProvider.ts",
    "server/services/nanobananaGeneration.ts",
    "server/services/aiGeneration.ts",
    "server/src/routers/director.ts",
    "server/src/lib/pricing.ts",
    "server/routers/casting.ts",
    "server/routers/models.ts",
    "server/db/schema.ts"
];

for (const file of files) {
    const p = path.join(process.cwd(), file);
    if (fs.existsSync(p)) {
        let content = fs.readFileSync(p, 'utf8');
        content = content.replace(/imagen-4\.0-ultra-generate-001/g, 'imagen-3.0-generate-001');
        content = content.replace(/imagen-4\.0-ultra-generate-002/g, 'imagen-3.0-generate-001');
        fs.writeFileSync(p, content);
        console.log("Updated", file);
    } else {
        console.log("Not found", file);
    }
}
