/**
 * Simple in-memory rate limiting for edge functions
 * Note: This is per-instance and resets on cold starts
 * For production, consider using a distributed cache like Redis
 */

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
}

// In-memory store (per edge function instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  const oneHourAgo = now - 3600000;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.lastRequest < oneHourAgo) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check if a request should be rate limited
 * @param key Unique identifier for the rate limit (e.g., "invite-user:admin-id")
 * @param config Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanup();
  
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry) {
    // First request
    rateLimitStore.set(key, {
      count: 1,
      firstRequest: now,
      lastRequest: now,
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }
  
  const windowStart = now - config.windowMs;
  
  if (entry.firstRequest < windowStart) {
    // Window expired, reset
    rateLimitStore.set(key, {
      count: 1,
      firstRequest: now,
      lastRequest: now,
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }
  
  // Within window
  if (entry.count >= config.maxRequests) {
    const resetAt = entry.firstRequest + config.windowMs;
    const retryAfter = Math.ceil((resetAt - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter,
    };
  }
  
  // Increment count
  entry.count++;
  entry.lastRequest = now;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.firstRequest + config.windowMs,
  };
}

/**
 * Pre-configured rate limits for common actions
 */
export const RATE_LIMITS = {
  /** User invitations: 10 per hour per admin */
  INVITE_USER: { maxRequests: 10, windowMs: 3600000 },
  
  /** Password resets: 5 per hour per admin */
  PASSWORD_RESET: { maxRequests: 5, windowMs: 3600000 },
  
  /** Push notifications: 50 per hour per church */
  PUSH_NOTIFICATION: { maxRequests: 50, windowMs: 3600000 },
  
  /** Sheet header fetches: 30 per hour per user */
  SHEET_HEADERS: { maxRequests: 30, windowMs: 3600000 },
} as const;

/**
 * Create a rate limit response with proper headers
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ 
      error: 'Limite de requisições excedido. Tente novamente mais tarde.',
      retryAfter: result.retryAfter,
    }),
    { 
      status: 429, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter || 60),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetAt),
      } 
    }
  );
}
