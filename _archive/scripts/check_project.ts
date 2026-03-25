import { getProjectContent } from './server/db';

async function check() {
    try {
        const content = await getProjectContent(15);
        console.log("PROJECT_CONTENT_15:", JSON.stringify(content, null, 2));
    } catch (err) {
        console.error("ERROR:", err);
    }
}

check();
