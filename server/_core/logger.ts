/**
 * Structured Logger
 * 
 * Provides a consistent way to log events and data across the application.
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Log an event with data
 */
export function log(level: LogLevel, event: string, data?: any) {
    const timestamp = new Date().toISOString();

    const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        event,
        ...(data && typeof data === 'object' ? data : { data })
    };

    if (level === "error") {
        console.error(JSON.stringify(logEntry));
    } else if (level === "warn") {
        console.warn(JSON.stringify(logEntry));
    } else {
        console.log(JSON.stringify(logEntry));
    }
}

/**
 * Convenience methods for different log levels
 */
export const logger = {
    info: (event: string, data?: any) => log("info", event, data),
    warn: (event: string, data?: any) => log("warn", event, data),
    error: (event: string, data?: any) => log("error", event, data),
    debug: (event: string, data?: any) => log("debug", event, data),
};
