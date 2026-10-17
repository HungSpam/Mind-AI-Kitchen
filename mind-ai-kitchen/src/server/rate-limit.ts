import { createHash } from 'node:crypto';
import { ApiError } from './http';

const local = new Map<string, { count: number; expires: number }>();
export async function rateLimit(request: Request) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
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
      if (!response.ok || typeof data.result !== 'number') throw new Error('limiter');
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
  if (process.env.NODE_ENV === 'production')
    throw new ApiError(503, 'LIMITER_CONFIG', 'Dịch vụ AI chưa được cấu hình đầy đủ.');
  for (const [k, v] of local) if (v.expires < now) local.delete(k);
  const entry = local.get(key) || { count: 0, expires: now + 60_000 };
  entry.count++;
  local.set(key, entry);
  if (entry.count > 10)
    throw new ApiError(429, 'RATE_LIMIT', 'Bạn gửi yêu cầu quá nhanh. Thử lại sau một phút.');
}
