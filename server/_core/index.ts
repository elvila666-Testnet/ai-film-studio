import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cookieParser from "cookie-parser";

// Dynamic imports for our modules
import authRoutes from "../routes/auth.js";
import googleAuthRoutes from "../routes/googleAuth.js";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { initBackgroundWorkers } from "../workers/index";
import { initializeModels, ensureActiveModels } from "../db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || "8089");

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth/google", googleAuthRoutes);

// tRPC
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Helper to find client path
function getClientPath() {
  const possiblePaths = [
    path.join(process.cwd(), "dist/client"),
    path.join(__dirname, "dist/client"),
    path.join(__dirname, "client"),
    "/app/dist/client",
    "/app/client",
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return "";
}

const clientPath = getClientPath();

// Serve static
if (clientPath) {
  app.use(express.static(clientPath, {
    maxAge: "1y",
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    const indexPath = path.join(clientPath, "index.html");
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(404).json({ error: "index.html not found at " + indexPath });
      }
    });
  });
}

// Background Init
initBackgroundWorkers();
(async () => {
  try {
    await initializeModels();
    await ensureActiveModels();
  } catch (err) {
    console.error("DB Init Error:", err);
  }
})();

// Start
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}/`);
});

// Shutdown
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
