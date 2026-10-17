const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scanAllergens } = require('../src/lib/allergenSynonyms.ts');
const { calculateNutrition } = require('../src/lib/nutritionDatabase.ts');
const { reviewRecipe } = require('../src/lib/recipe-review.ts');
const { matchCommand, acceptRecognition } = require('../src/features/cooking/commands.ts');
const { recipeRequestSchema } = require('../src/lib/schemas.ts');
const { profile, ingredients, recipe } = require('./fixtures.cjs');
const dataset = require('./benchmark-dataset.json');

for (const item of dataset)
  test('allergen: ' + item.id + ' ' + item.name, () => {
    const result = scanAllergens(item.recipeIngredients, item.userAllergy);
    assert.equal(result.hasRisk, item.expectedRisk);
    if (item.expectedKeyword)
      assert.ok(result.flags.some((f) => f.keyword === item.expectedKeyword));
  });
test('allergen check also covers steps and current profile', () => {
  const value = recipe({
    steps: [
      { id: 1, text: 'Thêm nước tương rồi trộn đều.' },
      { id: 2, text: 'Nấu chín và dọn ra đĩa.' },
    ],
  });
  const reviewed = reviewRecipe(value, { ...profile, allergies: 'đậu nành' });
  assert.equal(reviewed.audit.hasRisk, true);
  assert.equal(reviewed.checks[0].passed, false);
});
test('nutrition sums known weighed foods without model calories', () => {
  const result = calculateNutrition(ingredients);
  assert.equal(result.calories, 291);
  assert.equal(result.complete, true);
  assert.ok(
    result.items.every((i) => i.source.url.startsWith('https://fdc.nal.usda.gov/food-details/')),
  );
});
test('nutrition unknown or unweighed means no total', () => {
  for (const list of [
    [],
    [{ ...ingredients[0], grams: undefined }],
    [{ ...ingredients[0], name: 'Món không biết' }],
    [...ingredients, { ...ingredients[0], id: 'x', name: 'Sốt bí mật' }],
  ]) {
    const result = calculateNutrition(list);
    assert.equal(result.complete, false);
    assert.equal(result.calories, null);
    assert.equal(result.macros, null);
  }
});
test('nutrition does not substitute raw for cooked', () =>
  assert.equal(calculateNutrition([{ ...ingredients[0], name: 'Ức gà đã chiên' }]).matched, 0));
test('recipe input requires confirmed items and bounded portions', () => {
  assert.equal(recipeRequestSchema.safeParse({ profile, ingredients, servings: 2 }).success, true);
  for (const patch of [
    { servings: 0 },
    { servings: 99 },
    { ingredients: [] },
    { ingredients: [{ ...ingredients[0], confirmed: false }] },
    { ingredients: [{ ...ingredients[0], grams: -2 }] },
  ]) {
    assert.equal(
      recipeRequestSchema.safeParse({ profile, ingredients, servings: 2, ...patch }).success,
      false,
    );
  }
});
for (const [text, expected] of [
  ['tiếp theo', 'next'],
  ['quay lại', 'prev'],
  ['đọc lại', 'repeat'],
  ['dừng lại', 'stop'],
  ['đừng chuyển bước tiếp theo', null],
  ['không đọc lại', null],
  ['khoan, quay lại bước trước', 'prev'],
  ['tiếp theo, à thôi dừng lại', 'stop'],
  ['tiep theo', 'next'],
  ['improve the recipe', null],
  ['bếp nóng quá', null],
])
  test('voice: ' + text, () => assert.equal(matchCommand(text), expected));
test('interim speech cannot navigate but can stop immediately', () => {
  assert.equal(acceptRecognition('tiếp theo', false), null);
  assert.equal(acceptRecognition('dừng lại', false), 'stop');
  assert.equal(acceptRecognition('tiếp theo', true), 'next');
});
