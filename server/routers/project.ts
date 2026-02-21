
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";

export const projectRouter = router({
    list: publicProcedure.query(async () => {
        console.log("Project list query executing");
        // Placeholder - would typically query database
        return [
            { id: "1", title: "Sci-Fi Short", date: new Date().toISOString(), status: "completed" },
            { id: "2", title: "Nature Documentary", date: new Date().toISOString(), status: "draft" }
        ];
    }),

    create: publicProcedure
        .input(z.object({ title: z.string() }))
        .mutation(async ({ input }) => {
            return {
                id: Math.random().toString(36).substring(7),
                title: input.title,
                status: "draft",
                createdAt: new Date().toISOString()
            };
        })
});
