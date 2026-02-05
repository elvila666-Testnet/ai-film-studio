export type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, message: string, meta?: unknown) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {})
  };

  const out = JSON.stringify(entry);
  if (level === "error") {
    console.error(out);
  } else {
    console.log(out);
  }
}
