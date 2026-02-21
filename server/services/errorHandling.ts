import { TRPCError } from "@trpc/server";
import { notifyOwner } from "../_core/notification";

/**
 * Error handling and recovery service
 * Provides centralized error handling, logging, and recovery mechanisms
 */

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export interface ErrorContext {
  userId?: number;
  projectId?: number;
  operation?: string;
  metadata?: Record<string, any>;
}

export interface ErrorLog {
  timestamp: Date;
  severity: ErrorSeverity;
  message: string;
  code: string;
  context: ErrorContext;
  stack?: string;
  resolved: boolean;
  recoveryAttempts: number;
}

class ErrorHandler {
  private errorLogs: Map<string, ErrorLog> = new Map();
  private retryConfig = {
    maxAttempts: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
  };

  /**
   * Log error with context and severity
   */
  logError(
    message: string,
    code: string,
    severity: ErrorSeverity,
    context: ErrorContext,
    error?: Error
  ): ErrorLog {
    const errorLog: ErrorLog = {
      timestamp: new Date(),
      severity,
      message,
      code,
      context,
      stack: error?.stack,
      resolved: false,
      recoveryAttempts: 0,
    };

    const errorKey = `${code}-${context.userId}-${context.projectId}`;
    this.errorLogs.set(errorKey, errorLog);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error(`[${severity.toUpperCase()}] ${code}: ${message}`, {
        context,
        stack: error?.stack,
      });
    }

    // Log to Cloud Logging in production
    if (process.env.NODE_ENV === "production") {
      this.logToCloudLogging(errorLog);
    }

    // Notify owner for critical errors
    if (severity === "critical") {
      this.notifyOwnerOfCriticalError(errorLog);
    }

    return errorLog;
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: ErrorContext
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.initialDelay;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Log retry attempt
        this.logError(
          `Retry attempt ${attempt} of ${this.retryConfig.maxAttempts} for ${operationName}`,
          `RETRY_${operationName}`,
          attempt === this.retryConfig.maxAttempts ? "error" : "warning",
          context,
          lastError
        );

        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxAttempts) {
          break;
        }

        // Wait before retrying
        await this.sleep(delay);
        delay = Math.min(
          delay * this.retryConfig.backoffMultiplier,
          this.retryConfig.maxDelay
        );
      }
    }

    throw lastError;
  }

  /**
   * Circuit breaker pattern for external service calls
   */
  private circuitBreakers: Map<
    string,
    {
      state: "closed" | "open" | "half-open";
      failureCount: number;
      lastFailureTime: Date | null;
      successCount: number;
    }
  > = new Map();

  async callWithCircuitBreaker<T>(
    serviceName: string,
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    const breaker =
      this.circuitBreakers.get(serviceName) ||
      {
        state: "closed" as const,
        failureCount: 0,
        lastFailureTime: null,
        successCount: 0,
      };

    // Check if circuit should be reset
    if (breaker.state === "open") {
      const timeSinceLastFailure =
        Date.now() - (breaker.lastFailureTime?.getTime() || 0);
      if (timeSinceLastFailure > 60000) {
        // 1 minute timeout
        breaker.state = "half-open";
        breaker.failureCount = 0;
      } else {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: `Service ${serviceName} is temporarily unavailable`,
        });
      }
    }

    try {
      const result = await operation();

      // Success - update breaker state
      if (breaker.state === "half-open") {
        breaker.state = "closed";
        breaker.failureCount = 0;
        breaker.successCount = 0;
      }

      this.circuitBreakers.set(serviceName, breaker);
      return result;
    } catch (error) {
      breaker.failureCount++;
      breaker.lastFailureTime = new Date();

      // Open circuit after 5 consecutive failures
      if (breaker.failureCount >= 5) {
        breaker.state = "open";
        this.logError(
          `Circuit breaker opened for ${serviceName}`,
          `CIRCUIT_BREAKER_OPEN`,
          "error",
          context,
          error as Error
        );
      }

      this.circuitBreakers.set(serviceName, breaker);
      throw error;
    }
  }

  /**
   * Graceful degradation - return cached or default data on failure
   */
  async callWithFallback<T>(
    operation: () => Promise<T>,
    fallbackValue: T,
    operationName: string,
    context: ErrorContext
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logError(
        `Operation ${operationName} failed, using fallback value`,
        `FALLBACK_${operationName}`,
        "warning",
        context,
        error as Error
      );
      return fallbackValue;
    }
  }

  /**
   * Timeout wrapper for operations
   */
  async callWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string,
    context: ErrorContext
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`Operation ${operationName} timed out after ${timeoutMs}ms`)
            ),
          timeoutMs
        )
      ),
    ]).catch((error) => {
      this.logError(
        `Operation ${operationName} failed or timed out`,
        `TIMEOUT_${operationName}`,
        "error",
        context,
        error as Error
      );
      throw error;
    });
  }

  /**
   * Batch operation with partial failure handling
   */
  async executeBatch<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    operationName: string,
    context: ErrorContext
  ): Promise<{
    successful: R[];
    failed: Array<{ item: T; error: Error }>;
  }> {
    const successful: R[] = [];
    const failed: Array<{ item: T; error: Error }> = [];

    for (const item of items) {
      try {
        const result = await operation(item);
        successful.push(result);
      } catch (error) {
        failed.push({
          item,
          error: error as Error,
        });

        this.logError(
          `Batch operation ${operationName} failed for item`,
          `BATCH_FAILURE_${operationName}`,
          "warning",
          context,
          error as Error
        );
      }
    }

    // Log batch summary
    if (failed.length > 0) {
      this.logError(
        `Batch operation ${operationName} completed with ${failed.length} failures out of ${items.length}`,
        `BATCH_PARTIAL_FAILURE_${operationName}`,
        failed.length === items.length ? "error" : "warning",
        context
      );
    }

    return { successful, failed };
  }

  /**
   * Convert error to TRPC error
   */
  toTRPCError(error: unknown, context: ErrorContext): TRPCError {
    if (error instanceof TRPCError) {
      return error;
    }

    if (error instanceof Error) {
      this.logError(
        error.message,
        "UNKNOWN_ERROR",
        "error",
        context,
        error
      );

      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred. Please try again later.",
        cause: error,
      });
    }

    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    });
  }

  /**
   * Log to Cloud Logging
   */
  private logToCloudLogging(errorLog: ErrorLog): void {
    // This would integrate with Cloud Logging API
    // For now, just log to console
    console.error("Cloud Logging:", errorLog);
  }

  /**
   * Notify owner of critical errors
   */
  private async notifyOwnerOfCriticalError(errorLog: ErrorLog): Promise<void> {
    try {
      await notifyOwner({
        title: `CRITICAL ERROR: ${errorLog.code}`,
        content: `
An critical error occurred in AI Film Studio:

**Code:** ${errorLog.code}
**Message:** ${errorLog.message}
**Severity:** ${errorLog.severity}
**Time:** ${errorLog.timestamp.toISOString()}

**Context:**
- User ID: ${errorLog.context.userId || "N/A"}
- Project ID: ${errorLog.context.projectId || "N/A"}
- Operation: ${errorLog.context.operation || "N/A"}

**Stack Trace:**
\`\`\`
${errorLog.stack || "No stack trace available"}
\`\`\`

Please investigate immediately.
        `,
      });
    } catch (error) {
      console.error("Failed to notify owner of critical error:", error);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    byCode: Record<string, number>;
    bySeverity: Record<ErrorSeverity, number>;
    unresolvedCount: number;
  } {
    const stats = {
      totalErrors: this.errorLogs.size,
      byCode: {} as Record<string, number>,
      bySeverity: {
        info: 0,
        warning: 0,
        error: 0,
        critical: 0,
      },
      unresolvedCount: 0,
    };

    const logsArray = Array.from(this.errorLogs.values());
    for (const log of logsArray) {
      stats.byCode[log.code] = (stats.byCode[log.code] || 0) + 1;
      stats.bySeverity[log.severity as ErrorSeverity]++;
      if (!log.resolved) {
        stats.unresolvedCount++;
      }
    }

    return stats;
  }

  /**
   * Clear old error logs (older than 24 hours)
   */
  clearOldLogs(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const entriesArray = Array.from(this.errorLogs.entries());
    for (const [key, log] of entriesArray) {
      if (log.timestamp < oneDayAgo) {
        this.errorLogs.delete(key);
      }
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Periodic cleanup of old logs
if (process.env.NODE_ENV === "production") {
  setInterval(() => {
    errorHandler.clearOldLogs();
  }, 60 * 60 * 1000); // Every hour
}
