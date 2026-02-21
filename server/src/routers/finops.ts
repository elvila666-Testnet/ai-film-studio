import { z } from "zod";
import { router, publicProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { usageLedger } from "../../../drizzle/schema";
import { eq, sum } from "drizzle-orm";

export const finopsRouter = router({
    getProjectUsage: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database unreachable");

            const result = await db
                .select({ totalCost: sum(usageLedger.cost) })
                .from(usageLedger)
                .where(eq(usageLedger.projectId, input.projectId));

            return { totalCost: parseFloat(result[0].totalCost || '0') };
        }),
});
