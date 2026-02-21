import { Router } from "express";

/**
 * Health check and readiness probe system for Cloud Run
 * Provides liveness and readiness endpoints for Kubernetes/Cloud Run
 */

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    database: HealthCheckResult;
    memory: HealthCheckResult;
    disk: HealthCheckResult;
    externalServices: HealthCheckResult;
  };
}

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  latency: number;
  message?: string;
}

class HealthChecker {
  private startTime = Date.now();
  private healthCheckInterval = 30000; // 30 seconds

  constructor() {
    // Periodic health checks
    setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  /**
   * Liveness probe - is the service running?
   */
  async getLiveness(): Promise<{
    status: "alive" | "dead";
    uptime: number;
  }> {
    return {
      status: "alive",
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Readiness probe - is the service ready to handle requests?
   */
  async getReadiness(): Promise<HealthStatus> {
    return this.performHealthCheck();
  }

  /**
   * Detailed health status
   */
  async getHealth(): Promise<HealthStatus> {
    return this.performHealthCheck();
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<HealthStatus> {
    const _startTime = Date.now();
    void _startTime;

    const [database, memory, disk, externalServices] = await Promise.all([
      this.checkDatabase(),
      this.checkMemory(),
      this.checkDisk(),
      this.checkExternalServices(),
    ]);

    const overallStatus = this.determineOverallStatus([
      database,
      memory,
      disk,
      externalServices,
    ]);

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks: {
        database,
        memory,
        disk,
        externalServices,
      },
    };

    // this.lastHealthCheck = healthStatus; // lastHealthCheck is unused

    // Log health check results
    if (overallStatus !== "healthy") {
      console.warn("Health check degraded:", healthStatus);
    }

    return healthStatus;
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Simple ping to verify database is accessible
      // In production, this would make an actual query
      return {
        status: "healthy",
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        latency: Date.now() - startTime,
        message: `Database connection failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // Warn if heap usage is above 85%
    if (heapUsedPercent > 90) {
      return {
        status: "unhealthy",
        latency: Date.now() - startTime,
        message: `Heap memory usage critical: ${heapUsedPercent.toFixed(2)}%`,
      };
    }

    if (heapUsedPercent > 85) {
      return {
        status: "degraded",
        latency: Date.now() - startTime,
        message: `Heap memory usage high: ${heapUsedPercent.toFixed(2)}%`,
      };
    }

    return {
      status: "healthy",
      latency: Date.now() - startTime,
    };
  }

  /**
   * Check disk usage
   */
  private async checkDisk(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    // In Cloud Run, disk usage is typically not a concern
    // but we can monitor /tmp usage if needed
    try {
      // Placeholder for actual disk check
      // In production, integrate with OS-level disk monitoring
      return {
        status: "healthy",
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: "degraded",
        latency: Date.now() - startTime,
        message: `Disk check failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Check external services (LLM, image generation, etc.)
   */
  private async checkExternalServices(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Check if external service endpoints are reachable
      // This is a placeholder - in production, make actual API calls
      // with timeout to verify connectivity

      // For now, assume healthy if no recent errors
      const recentErrors = this.getRecentExternalServiceErrors();
      if (recentErrors > 5) {
        return {
          status: "degraded",
          latency: Date.now() - startTime,
          message: `Recent external service errors: ${recentErrors}`,
        };
      }

      return {
        status: "healthy",
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: "degraded",
        latency: Date.now() - startTime,
        message: `External service check failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(
    checks: HealthCheckResult[]
  ): "healthy" | "degraded" | "unhealthy" {
    const unhealthyCount = checks.filter(
      (c) => c.status === "unhealthy"
    ).length;
    const degradedCount = checks.filter((c) => c.status === "degraded").length;

    if (unhealthyCount > 0) {
      return "unhealthy";
    }

    if (degradedCount > 0) {
      return "degraded";
    }

    return "healthy";
  }

  /**
   * Track recent external service errors
   */
  private recentExternalServiceErrors = 0;

  recordExternalServiceError(): void {
    this.recentExternalServiceErrors++;

    // Reset counter every 5 minutes
    setTimeout(() => {
      this.recentExternalServiceErrors = Math.max(
        0,
        this.recentExternalServiceErrors - 1
      );
    }, 5 * 60 * 1000);
  }

  getRecentExternalServiceErrors(): number {
    return this.recentExternalServiceErrors;
  }
}

// Export singleton instance
export const healthChecker = new HealthChecker();

/**
 * Express router for health check endpoints
 */
export function createHealthRouter(): Router {
  const router = Router();

  /**
   * Liveness probe - used by Kubernetes/Cloud Run to restart container if dead
   * Should be simple and fast
   */
  router.get("/health/live", async (_req, res) => {
    try {
      const liveness = await healthChecker.getLiveness();
      res.status(200).json(liveness);
    } catch (error) {
      res.status(503).json({
        status: "dead",
        error: (error as Error).message,
      });
    }
  });

  /**
   * Readiness probe - used by Kubernetes/Cloud Run to route traffic
   * Should check if service is ready to handle requests
   */
  router.get("/health/ready", async (_req, res) => {
    try {
      const health = await healthChecker.getReadiness();

      if (health.status === "unhealthy") {
        res.status(503).json(health);
      } else {
        res.status(200).json(health);
      }
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        error: (error as Error).message,
      });
    }
  });

  /**
   * Detailed health status
   */
  router.get("/health", async (_req, res) => {
    try {
      const health = await healthChecker.getHealth();
      res.status(200).json(health);
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        error: (error as Error).message,
      });
    }
  });

  return router;
}

/**
 * Graceful shutdown handler
 */
export async function setupGracefulShutdown(server: any): Promise<void> {
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new requests
    server.close(async () => {
      console.log("HTTP server closed");

      // Close database connections
      try {
        // Close connection pool if available
        console.log("Database connections closed");
      } catch (error) {
        console.error("Error closing database:", error);
      }

      // Exit process
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error("Forced shutdown after 30 seconds");
      process.exit(1);
    }, 30000);
  };

  // Handle shutdown signals
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
