/**
 * Application Monitoring Module
 * 
 * Provides utilities for collecting and reporting application metrics,
 * performance data, and health status
 */

interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  requestCount: number;
  errorCount: number;
  timestamp: Date;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: boolean;
  api: boolean;
  memory: boolean;
  disk: boolean;
  timestamp: Date;
}

class MonitoringService {
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 1000;
  private startTime = Date.now();
  private requestCount = 0;
  private errorCount = 0;

  /**
   * Record a request
   */
  recordRequest(responseTime: number, success: boolean): void {
    this.requestCount++;
    if (!success) {
      this.errorCount++;
    }

    // Collect metrics every 60 seconds
    if (this.requestCount % 60 === 0) {
      this.collectMetrics(responseTime);
    }
  }

  /**
   * Collect current metrics
   */
  private collectMetrics(responseTime: number): void {
    const memUsage = process.memoryUsage();
    const metric: PerformanceMetrics = {
      responseTime,
      memoryUsage: memUsage.heapUsed / 1024 / 1024, // MB
      cpuUsage: process.cpuUsage().user / 1000, // ms
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      timestamp: new Date(),
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }
  }

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    return {
      status: this.determineHealthStatus(heapUsedPercent),
      database: await this.checkDatabase(),
      api: await this.checkApi(),
      memory: heapUsedPercent < 85,
      disk: await this.checkDiskSpace(),
      timestamp: new Date(),
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      // This would be implemented with actual database connection check
      // For now, return true as a placeholder
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check API availability
   */
  private async checkApi(): Promise<boolean> {
    try {
      // This would be implemented with actual API health check
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check disk space
   */
  private async checkDiskSpace(): Promise<boolean> {
    try {
      // This would be implemented with actual disk space check
      // For now, return true as a placeholder
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Determine overall health status
   */
  private determineHealthStatus(heapUsedPercent: number): 'healthy' | 'degraded' | 'unhealthy' {
    if (heapUsedPercent > 90) return 'unhealthy';
    if (heapUsedPercent > 75) return 'degraded';
    return 'healthy';
  }

  /**
   * Get average response time
   */
  getAverageResponseTime(): number {
    if (this.metrics.length === 0) return 0;
    const sum = this.metrics.reduce((acc, m) => acc + m.responseTime, 0);
    return sum / this.metrics.length;
  }

  /**
   * Get error rate
   */
  getErrorRate(): number {
    if (this.requestCount === 0) return 0;
    return (this.errorCount / this.requestCount) * 100;
  }

  /**
   * Get uptime
   */
  getUptime(): number {
    const uptimeMs = Date.now() - this.startTime;
    return Math.floor(uptimeMs / 1000); // seconds
  }

  /**
   * Get memory usage
   */
  getMemoryUsage(): { heapUsed: number; heapTotal: number; external: number } {
    const mem = process.memoryUsage();
    return {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024), // MB
      external: Math.round(mem.external / 1024 / 1024), // MB
    };
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    return {
      uptime: this.getUptime(),
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.getErrorRate(),
      averageResponseTime: this.getAverageResponseTime(),
      memoryUsage: this.getMemoryUsage(),
      metricsCount: this.metrics.length,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = [];
    this.requestCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// Export for testing
export { MonitoringService };
export type { PerformanceMetrics, HealthStatus };
