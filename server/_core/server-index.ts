import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import process from "process";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { log } from "./logger";
import { createContext } from "./context";
import { appRouter } from "../routers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const clientPath = path.join(__dirname, "../../dist");

// crash visibility
process.on("uncaughtException", err => {
  log("error", "uncaughtException", { err });
  process.exit(1);
});
process.on("unhandledRejection", err => {
  log("error", "unhandledRejection", { err });
  process.exit(1);
});

// basic security headers
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// request logging
app.use((req, _res, next) => {
  log("info", "request", { method: req.method, url: req.url });
  next();
});

// body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// healthcheck
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// tRPC API routes - CRITICAL: This must come BEFORE static file serving
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// static frontend
app.use(express.static(clientPath, { maxAge: "1y", immutable: true }));

// SPA fallback - serve index.html for all unmatched routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

// start
const server = app.listen(PORT, () => {
  log("info", "server_started", { port: PORT, pid: process.pid, env: process.env.NODE_ENV });
});

// graceful shutdown
const shutdown = (signal: string) => {
  log("warn", "shutdown_signal", { signal });
  server.close(() => {
    log("info", "server_closed");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
