import { createHash } from 'node:crypto';
import { ApiError } from './http';

const local = new Map<string, { count: number; expires: number }>();
let warnedLocal = false;
export async function rateLimit(request: Request) {
  // Keep each provider's credentials together; never mix the two prefixes.
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const url = upstashUrl || upstashToken ? upstashUrl : process.env.KV_REST_API_URL?.trim();
  const token = upstashUrl || upstashToken ? upstashToken : process.env.KV_REST_API_TOKEN?.trim();
  if (
    Boolean(url) !== Boolean(token) ||
    (!url && process.env.RATE_LIMIT_REQUIRE_REDIS?.trim() === 'true')
  )
    throw new ApiError(503, 'LIMITER_CONFIG', 'Dịch vụ AI chưa được cấu hình đầy đủ.');
  const now = Date.now();
  // Only use a proxy-controlled IP header when explicitly configured by the operator.
  const ip = process.env.TRUSTED_IP_HEADER
    ? request.headers.get(process.env.TRUSTED_IP_HEADER)?.split(',')[0]?.trim() || 'shared'
    : 'shared';
  const key = 'kitchen:rate:' + createHash('sha256').update(ip).digest('hex').slice(0, 24);
  if (url && token) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          'EVAL',
          "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",
          '1',
          key,
        ]),
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok || !Number.isSafeInteger(data.result) || data.result < 1)
        throw new Error('limiter');
      if (data.result > 10)
        throw new ApiError(429, 'RATE_LIMIT', 'Bạn gửi yêu cầu quá nhanh. Thử lại sau một phút.');
      return;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        503,
        'LIMITER_UNAVAILABLE',
        'Dịch vụ đang tạm nghỉ. Vui lòng thử lại sau.',
      );
    }
  }
  if (process.env.NODE_ENV === 'production' && !warnedLocal) {
    console.warn(
      '[rate-limit] Redis not configured; using a per-instance limit of 10 requests/minute.',
    );
    warnedLocal = true;
  }
  for (const [k, v] of local) if (v.expires <= now) local.delete(k);
  const entry = local.get(key) || { count: 0, expires: now + 60_000 };
  entry.count++;
  local.set(key, entry);
  if (entry.count > 10)
    throw new ApiError(429, 'RATE_LIMIT', 'Bạn gửi yêu cầu quá nhanh. Thử lại sau một phút.');
}
