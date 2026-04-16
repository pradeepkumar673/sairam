/**
 * middleware/rateLimiter.middleware.ts
 * Rate limiters for different endpoint groups
 */

import { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

/**
 * Simple in-process rate limiter.
 * For production at scale, swap the store for a Redis-backed solution.
 */
const createRateLimiter = (
  windowMs: number,
  maxRequests: number,
  message: string
) => {
  const store: RateLimitStore = {};

  // Clean up expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const key of Object.keys(store)) {
      if (store[key].resetAt < now) delete store[key];
    }
  }, 5 * 60 * 1000);

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = (req as any).user?._id?.toString() || req.ip || "anonymous";
    const now = Date.now();

    if (!store[userId] || store[userId].resetAt < now) {
      store[userId] = { count: 1, resetAt: now + windowMs };
      return next();
    }

    store[userId].count += 1;

    // Set standard rate-limit headers
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - store[userId].count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(store[userId].resetAt / 1000));

    if (store[userId].count > maxRequests) {
      res.status(429).json({
        success: false,
        statusCode: 429,
        message,
        retryAfter: Math.ceil((store[userId].resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
};

/** General API: 200 requests per 15 minutes */
export const generalLimiter = createRateLimiter(
  15 * 60 * 1000,
  200,
  "Too many requests. Please slow down and try again in a few minutes."
);

/** Auth endpoints: 10 attempts per 15 minutes (brute-force protection) */
export const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  10,
  "Too many login attempts. Please wait 15 minutes before trying again."
);

/** AI endpoints: 30 requests per 10 minutes (Gemini API cost control) */
export const aiLimiter = createRateLimiter(
  10 * 60 * 1000,
  30,
  "AI request limit reached. You can make 30 AI requests every 10 minutes."
);

/** SOS endpoint: 5 triggers per minute (prevent accidental spam) */
export const sosLimiter = createRateLimiter(
  60 * 1000,
  5,
  "SOS rate limit reached. Please wait a moment before triggering again."
);

/** File upload endpoints: 20 uploads per hour */
export const uploadLimiter = createRateLimiter(
  60 * 60 * 1000,
  20,
  "Upload limit reached. You can upload 20 files per hour."
);
