import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ============================================
// RATE LIMITING MIDDLEWARE
// ============================================

// Simple in-memory rate limiter (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit configurations for different endpoints
const RATE_LIMITS = {
  // API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
  // Auth endpoints (more restrictive)
  auth: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  },
  // Contact/Newsletter (more restrictive to prevent spam)
  contact: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute
  },
}

function getRateLimitConfig(pathname: string) {
  if (pathname.startsWith("/api/auth")) {
    return RATE_LIMITS.auth
  }
  if (pathname.startsWith("/api/newsletter") || pathname.startsWith("/api/contact")) {
    return RATE_LIMITS.contact
  }
  if (pathname.startsWith("/api")) {
    return RATE_LIMITS.api
  }
  return null // No rate limiting for non-API routes
}

function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const cfConnectingIp = request.headers.get("cf-connecting-ip")
  
  // Use first IP from forwarded-for chain, or fallback to other headers
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || cfConnectingIp || "unknown"
  
  return ip
}

function checkRateLimit(
  identifier: string,
  pathname: string
): { allowed: boolean; remaining: number; resetTime: number } {
  const config = getRateLimitConfig(pathname)
  
  if (!config) {
    return { allowed: true, remaining: -1, resetTime: 0 }
  }

  const now = Date.now()
  const key = `${identifier}:${pathname.split("/").slice(0, 3).join("/")}`
  const existing = rateLimitStore.get(key)

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k)
      }
    }
  }

  if (!existing || now > existing.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    }
  }

  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime,
    }
  }

  // Increment count
  existing.count++
  rateLimitStore.set(key, existing)

  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetTime: existing.resetTime,
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Only apply rate limiting to API routes
  if (!pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  const identifier = getClientIdentifier(request)
  const { allowed, remaining, resetTime } = checkRateLimit(identifier, pathname)

  if (!allowed) {
    return NextResponse.json(
      {
        error: "Too many requests",
        message: "You have exceeded the rate limit. Please try again later.",
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": resetTime.toString(),
          "Retry-After": Math.ceil((resetTime - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  // Add rate limit headers to successful responses
  const response = NextResponse.next()
  
  if (remaining >= 0) {
    response.headers.set("X-RateLimit-Remaining", remaining.toString())
    response.headers.set("X-RateLimit-Reset", resetTime.toString())
  }

  return response
}

export const config = {
  matcher: [
    // Apply to API routes only
    "/api/:path*",
  ],
}
