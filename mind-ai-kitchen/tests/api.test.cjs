const { test } = require('node:test');
const assert = require('node:assert/strict');
const { profile, ingredients, generated } = require('./fixtures.cjs');
const recipeRoute = require('../src/app/api/recipe/route.ts');
const visionRoute = require('../src/app/api/vision/route.ts');
const suggestRoute = require('../src/app/api/suggest/route.ts');
process.env.NODE_ENV = 'test';
delete process.env.APP_ORIGIN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
const originalFetch = global.fetch;
function request(body, headers = {}) {
  return new Request('http://localhost:3000/api/recipe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}
function mockAI(value) {
  global.fetch = async () =>
    Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] });
}
test('API contract and error paths', async (t) => {
  await t.test('rejects foreign origin before AI', async () =>
    assert.equal(
      (
        await recipeRoute.POST(
          request({ profile, ingredients, servings: 1 }, { origin: 'https://other.example' }),
        )
      ).status,
      403,
    ),
  );
  await t.test('rejects incomplete and invalid quantities', async () =>
    assert.equal(
      (await recipeRoute.POST(request({ profile, ingredients, servings: -1 }))).status,
      400,
    ),
  );
  await t.test('blocks input allergens', async () =>
    assert.equal(
      (
        await recipeRoute.POST(
          request({ profile: { ...profile, allergies: 'gà' }, ingredients, servings: 1 }),
        )
      ).status,
      422,
    ),
  );
  await t.test('missing key returns 503, never a sample recipe', async () => {
    delete process.env.GEMINI_API_KEY;
    const response = await recipeRoute.POST(request({ profile, ingredients, servings: 1 }));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).data, null);
  });
  process.env.GEMINI_API_KEY = 'test-only';
  await t.test('successful recipe derives nutrition server-side', async () => {
    mockAI(generated);
    const response = await recipeRoute.POST(request({ profile, ingredients, servings: 2 }));
    assert.equal(response.status, 200);
    const { data } = await response.json();
    assert.equal(data.nutrition.calories, 291);
    assert.equal(data.servings, 2);
    assert.equal(data.audit.hasRisk, false);
  });
  await t.test('rejects invented ingredient ids', async () => {
    mockAI({ ...generated, ingredientIds: ['unknown'] });
    assert.equal(
      (await recipeRoute.POST(request({ profile, ingredients, servings: 1 }))).status,
      502,
    );
  });
  await t.test('blocks allergen hidden in steps', async () => {
    mockAI({
      ...generated,
      steps: [{ id: 1, text: 'Thêm nước tương và hấp chín.' }, ...generated.steps],
    });
    assert.equal(
      (
        await recipeRoute.POST(
          request({ profile: { ...profile, allergies: 'đậu nành' }, ingredients, servings: 1 }),
        )
      ).status,
      422,
    );
  });
  await t.test('invalid JSON model output is rejected', async () => {
    mockAI({ name: 'Incomplete' });
    assert.equal(
      (await recipeRoute.POST(request({ profile, ingredients, servings: 1 }))).status,
      502,
    );
  });
  await t.test('vision failure never returns sample ingredients', async () => {
    global.fetch = async () => new Response('', { status: 500 });
    const response = await visionRoute.POST(
      request({ imageBase64: 'data:image/jpeg;base64,YWJj' }),
    );
    assert.equal(response.status, 503);
    assert.equal((await response.json()).data, null);
  });
  await t.test('vision items must be explicitly confirmed', async () => {
    mockAI({ ingredients: [{ name: 'Cà chua' }] });
    const response = await visionRoute.POST(
      request({ imageBase64: 'data:image/jpeg;base64,YWJj' }),
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.ingredients[0].confirmed, false);
  });
  await t.test('suggestions filter current allergies', async () => {
    mockAI({ suggestions: ['Nước tương', 'Hành lá'] });
    const response = await suggestRoute.POST(
      request({ profile: { ...profile, allergies: 'đậu nành' }, ingredients }),
    );
    assert.deepEqual((await response.json()).data.suggestions, ['Hành lá']);
  });
  global.fetch = originalFetch;
});
