import 'dotenv/config';
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./drizzle/schema.ts",
    out: "./drizzle_snapshot",
    dialect: "mysql",
    dbCredentials: {
        url: process.env.DATABASE_URL || "mysql://root:password@localhost:3306/ai_film_studio",
    },
});
