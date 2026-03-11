import { appRouter } from './server/routers';

async function run() {
    try {
        const caller = appRouter.createCaller({
            user: { id: 1, openId: "test", name: "test", email: "test@test.com" }
        });
        console.log("Calling generateGrid for project 18...");
        const result = await caller.storyboard.generateGrid({ projectId: 18 });
        console.log("Success!", result);
    } catch (err) {
        console.error("Caught a TRPC Error:", err);
        if (err.stack) console.error(err.stack);
    }
}
run();
