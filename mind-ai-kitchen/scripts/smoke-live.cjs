// Optional live integration check: uses only public synthetic ingredients, never saved user data.
require('@next/env').loadEnvConfig(process.cwd(), true);
require('../tests/register.cjs');
const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
process.env.NODE_ENV = 'test';
const { POST } = require('../src/app/api/recipe/route.ts');
const { profile, ingredients } = require('../tests/fixtures.cjs');
(async () => {
  const started = performance.now();
  const response = await POST(
    new Request('http://localhost:3000/api/recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, ingredients, servings: 2 }),
    }),
  );
  const result = await response.json();
  const report = {
    generatedAt: new Date().toISOString(),
    status: response.status,
    elapsedMs: Math.round(performance.now() - started),
    model: result.data?.model,
    recipeName: result.data?.name,
    ingredientCount: result.data?.ingredients?.length,
    stepCount: result.data?.steps?.length,
    errorCode: result.error?.code,
    limitation:
      'One synthetic live recipe call. Does not evaluate recipe quality, vision, real audio or production Redis configuration.',
  };
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/live-smoke.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!response.ok) process.exitCode = 1;
})().catch(() => {
  console.error('Live smoke failed; credentials and upstream payload intentionally omitted.');
  process.exitCode = 1;
});
