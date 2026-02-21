import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import jwt from "jsonwebtoken";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";

const JWT_SECRET = ENV.cookieSecret || "your-secret-key-change-in-production";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const token = opts.req.cookies?.[COOKIE_NAME];

    if (token) {
      const { getDb } = await import("../db");
      const { users: dbUsers } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      // Verify standard JWT
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
        const db = await getDb();
        if (db) {
          const result = await db.select().from(dbUsers).where(eq(dbUsers.id, decoded.id)).limit(1);
          user = result[0] || null;
        }
      } catch (jwtErr) {
        user = null;
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
