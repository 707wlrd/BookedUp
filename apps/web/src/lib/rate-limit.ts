/**
 * Simple in-memory rate limiter.
 * Works per-instance (fine for serverless with short windows).
 * For production at scale, swap backing store with Upstash Redis.
 *
 * Usage:
 *   const result = rateLimit(req, { limit: 10, windowMs: 60_000 });
 *   if (!result.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

interface Options {
  /** Max requests allowed per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

interface Result {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

function getIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export function rateLimit(req: Request, options: Options): Result {
  const { limit, windowMs } = options;
  const ip  = getIp(req);
  const now = Date.now();

  // Clean up expired entries every ~100 calls (probabilistic)
  if (Math.random() < 0.01) {
    for (const [key, win] of store) {
      if (win.resetAt < now) store.delete(key);
    }
  }

  let win = store.get(ip);
  if (!win || win.resetAt < now) {
    win = { count: 0, resetAt: now + windowMs };
    store.set(ip, win);
  }

  win.count++;

  return {
    ok:        win.count <= limit,
    remaining: Math.max(0, limit - win.count),
    resetAt:   win.resetAt,
  };
}
