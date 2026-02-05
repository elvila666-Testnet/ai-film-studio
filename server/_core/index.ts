import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import process from "process";
import { log } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const clientPath = path.join(__dirname, "client");

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
  next();
});

// request logging
app.use((req, _res, next) => {
  log("info", "request", { method: req.method, url: req.url });
  next();
});

// static frontend
app.use(express.static(clientPath, { maxAge: "1y", immutable: true }));

// healthcheck
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

// start
const server = app.listen(PORT, () => {
  log("info", "server_started", { port: PORT, pid: process.pid });
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
