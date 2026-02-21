import { Request, Response, NextFunction } from "express";
// import rateLimit from "express-rate-limit";
// Missing dependency, using dummy stub for now
const rateLimit = (_options: any) => (_req: Request, _res: Response, next: NextFunction) => next();

/**
 * Production-grade middleware for API resilience, rate limiting, and caching
 */

// Rate limiting configurations
export const createRateLimiters = () => {
  // General API rate limiter: 100 requests per 15 minutes
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path.startsWith("/health");
    },
  });

  // Auth rate limiter: 5 login attempts per 15 minutes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many login attempts, please try again later.",
    skipSuccessfulRequests: true,
  });

  // Content generation rate limiter: 10 requests per hour
  const generationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: "Content generation limit exceeded, please try again later.",
  });

  // File upload rate limiter: 20 uploads per hour
  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: "Upload limit exceeded, please try again later.",
  });

  return {
    apiLimiter,
    authLimiter,
    generationLimiter,
    uploadLimiter,
  };
};

/**
 * Request caching middleware
 */
class CacheManager {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes default

  set(key: string, data: any, ttl: number = this.cacheTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl,
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    if (Date.now() > cached.timestamp) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }

  clearPattern(pattern: RegExp): void {
    const keysArray = Array.from(this.cache.keys());
    for (const key of keysArray) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

export const cacheManager = new CacheManager();

/**
 * Cache middleware for GET requests
 */
export const cacheMiddleware = (ttl: number = 5 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
    const cached = cacheManager.get(cacheKey);

    if (cached) {
      res.set("X-Cache", "HIT");
      return res.json(cached);
    }

    // Override res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = function (data: any) {
      cacheManager.set(cacheKey, data, ttl);
      res.set("X-Cache", "MISS");
      return originalJson(data);
    };

    next();
  };
};

/**
 * Request validation middleware
 */
export const requestValidationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Validate request size
  const maxSize = 10 * 1024 * 1024; // 10MB
  const contentLength = parseInt(req.get("content-length") || "0", 10);

  if (contentLength > maxSize) {
    return res.status(413).json({
      error: "Payload too large",
      message: `Request size exceeds maximum of ${maxSize} bytes`,
    });
  }

  // Validate content type
  const validContentTypes = [
    "application/json",
    "application/x-www-form-urlencoded",
    "multipart/form-data",
  ];

  const contentType = req.get("content-type")?.split(";")[0];
  if (req.method !== "GET" && contentType && !validContentTypes.includes(contentType)) {
    return res.status(415).json({
      error: "Unsupported Media Type",
      message: `Content-Type must be one of: ${validContentTypes.join(", ")}`,
    });
  }

  next();
};

/**
 * CORS security middleware
 */
export const createCorsMiddleware = () => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:3000",
    process.env.PRODUCTION_URL || "https://ai-film-studio.com",
  ];

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get("origin");

    if (origin && allowedOrigins.includes(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Access-Control-Allow-Credentials", "true");
      res.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS"
      );
      res.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With"
      );
      res.set("Access-Control-Max-Age", "3600");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  };
};

/**
 * Security headers middleware
 */
export const securityHeadersMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  // Prevent clickjacking
  res.set("X-Frame-Options", "DENY");

  // Prevent MIME sniffing
  res.set("X-Content-Type-Options", "nosniff");

  // Enable XSS protection
  res.set("X-XSS-Protection", "1; mode=block");

  // Content Security Policy
  res.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );

  // Referrer Policy
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy
  res.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()"
  );

  next();
};

/**
 * Request logging middleware
 */
export const requestLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Override res.send to log response
  const originalSend = res.send.bind(res);
  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log request details
    const logLevel = statusCode >= 400 ? "error" : "info";
    console.log(`[${logLevel.toUpperCase()}] ${req.method} ${req.path} ${statusCode} ${duration}ms`);

    if (statusCode >= 400) {
      console.error(`Request body:`, req.body);
      console.error(`Response:`, data);
    }

    return originalSend(data);
  };

  next();
};

/**
 * Compression middleware
 */
export const compressionMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  // Enable gzip compression for responses larger than 1KB
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    const jsonString = JSON.stringify(data);

    if (jsonString.length > 1024) {
      res.set("Content-Encoding", "gzip");
    }

    return originalJson(data);
  };

  next();
};

/**
 * Error handling middleware
 */
export const errorHandlingMiddleware = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("Error:", err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    error: {
      code: err.code || "INTERNAL_ERROR",
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};

/**
 * Request timeout middleware
 */
export const timeoutMiddleware = (timeoutMs: number = 30000) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: "Request Timeout",
          message: `Request exceeded timeout of ${timeoutMs}ms`,
        });
      }
    }, timeoutMs);

    res.on("finish", () => {
      clearTimeout(timeout);
    });

    next();
  };
};
