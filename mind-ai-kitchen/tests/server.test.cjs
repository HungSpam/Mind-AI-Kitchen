const { test } = require('node:test');
const assert = require('node:assert/strict');
const { z } = require('zod');
const { readBody, failure, ApiError } = require('../src/server/http.ts');
const { rateLimit } = require('../src/server/rate-limit.ts');

test('streamed bodies enforce limits without content-length', async () => {
  const request = new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: 'x'.repeat(100) }),
  });
  await assert.rejects(
    readBody(request, z.object({ value: z.string() }), 50),
    (error) => error.status === 413,
  );
});
test('production limiter fails closed and validates upstream results', async (t) => {
  const originalFetch = global.fetch;
  process.env.NODE_ENV = 'production';
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const request = new Request('https://kitchen.example/api');
  try {
    await t.test('missing shared limiter', async () =>
      assert.rejects(rateLimit(request), (error) => error.code === 'LIMITER_CONFIG'),
    );
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test';
    await t.test('network failure', async () => {
      global.fetch = async () => {
        throw new Error('offline');
      };
      await assert.rejects(rateLimit(request), (error) => error.status === 503);
    });
    await t.test('invalid response', async () => {
      global.fetch = async () => Response.json({ result: '1' });
      await assert.rejects(rateLimit(request), (error) => error.status === 503);
    });
    await t.test('atomic quota and expiry command', async () => {
      global.fetch = async (_url, options) => {
        const command = JSON.parse(options.body);
        assert.equal(command[0], 'EVAL');
        assert.ok(command[1].includes('EXPIRE'));
        assert.ok(command[3].startsWith('kitchen:rate:'));
        return Response.json({ result: 10 });
      };
      await rateLimit(request);
    });
    await t.test('quota exceeded and Retry-After', async () => {
      global.fetch = async () => Response.json({ result: 11 });
      await assert.rejects(rateLimit(request), (error) => error.status === 429);
      assert.equal(
        failure(new ApiError(429, 'RATE_LIMIT', 'Retry')).headers.get('retry-after'),
        '60',
      );
    });
  } finally {
    global.fetch = originalFetch;
  }
});
