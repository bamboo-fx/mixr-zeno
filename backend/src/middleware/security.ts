import type { Context } from "hono";
import { createMiddleware } from "hono/factory";

// ============================================
// Rate Limiting Middleware
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting (per IP)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (c: Context) => string; // Custom key generator
  skipPaths?: string[]; // Paths to skip rate limiting
}

/**
 * Creates a rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (c) => getClientIp(c),
    skipPaths = [],
  } = options;

  return createMiddleware(async (c, next) => {
    // Skip rate limiting for certain paths
    const path = c.req.path;
    if (skipPaths.some((skip) => path.startsWith(skip))) {
      return next();
    }

    const key = keyGenerator(c);
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      // New window
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
    } else if (entry.count >= maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header("Retry-After", String(retryAfter));
      c.header("X-RateLimit-Limit", String(maxRequests));
      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
      return c.json(
        { error: "Too many requests. Please try again later." },
        429
      );
    } else {
      // Increment counter
      entry.count++;
    }

    // Add rate limit headers
    const currentEntry = rateLimitStore.get(key)!;
    c.header("X-RateLimit-Limit", String(maxRequests));
    c.header(
      "X-RateLimit-Remaining",
      String(Math.max(0, maxRequests - currentEntry.count))
    );
    c.header("X-RateLimit-Reset", String(Math.ceil(currentEntry.resetAt / 1000)));

    return next();
  });
}

/**
 * Stricter rate limiting for sensitive endpoints (auth, verification)
 * Note: Increased limits for development - reduce in production
 */
export const strictRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  maxRequests: 50, // 50 requests per minute (generous for dev)
});

/**
 * Standard API rate limiting
 */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  skipPaths: ["/health", "/api/auth/get-session"],
});

// ============================================
// Security Headers Middleware
// ============================================

/**
 * Adds security headers to all responses
 */
export const securityHeaders = createMiddleware(async (c, next) => {
  await next();

  // Prevent clickjacking
  c.header("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  c.header("X-Content-Type-Options", "nosniff");

  // XSS protection (for older browsers)
  c.header("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy for API responses
  c.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");

  // Permissions Policy - disable unnecessary browser features
  c.header(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
  );
});

// ============================================
// Request Timeout Middleware
// ============================================

interface TimeoutOptions {
  timeoutMs: number;
}

/**
 * Adds request timeout handling
 */
export function requestTimeout(options: TimeoutOptions) {
  const { timeoutMs } = options;

  return createMiddleware(async (c, next) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      await next();
    } finally {
      clearTimeout(timeoutId);
    }
  });
}

// ============================================
// Auth Required Middleware
// ============================================

/**
 * Middleware that requires authentication
 * Use this on routes that should only be accessible to logged-in users
 */
export const requireAuth = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Authentication required" }, 401);
  }
  return next();
});

/**
 * Middleware that validates the requester matches the session user
 * Prevents users from impersonating others via requesterId
 */
export const validateRequester = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Authentication required" }, 401);
  }

  // Check body for requesterId
  const contentType = c.req.header("content-type");
  if (contentType?.includes("application/json")) {
    try {
      const body = await c.req.json();
      if (body.requesterId && body.requesterId !== user.id) {
        return c.json({ error: "Unauthorized: requester mismatch" }, 403);
      }
      // Store the validated body for downstream use
      c.set("validatedBody" as any, body);
    } catch {
      // Not JSON or parse error - continue
    }
  }

  return next();
});

// ============================================
// Error Sanitization Middleware
// ============================================

/**
 * Catches errors and returns sanitized messages
 * Prevents leaking internal error details to clients
 */
export const errorSanitizer = createMiddleware(async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error("[Error]", error);

    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === "production";
    const message = isProduction
      ? "An unexpected error occurred"
      : error instanceof Error
        ? error.message
        : "Unknown error";

    return c.json({ error: message }, 500);
  }
});

// ============================================
// Utility Functions
// ============================================

/**
 * Extracts client IP from request headers
 * Handles common proxy headers
 */
export function getClientIp(c: Context): string {
  // Check common proxy headers
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    const firstIp = forwardedFor.split(",")[0];
    return firstIp ? firstIp.trim() : "unknown";
  }

  const realIp = c.req.header("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback - use a hash of other identifying info
  const userAgent = c.req.header("user-agent") || "unknown";
  return `unknown-${hashString(userAgent)}`;
}

/**
 * Simple string hash for fallback IP identification
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}
