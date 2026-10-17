const { reviewRecipe } = require('../src/lib/recipe-review.ts');
const profile = { bodyType: '', goal: 'health', allergies: '', preferences: 'ít cay' };
const ingredients = [
  { id: 'chicken', name: 'Ức gà', grams: 200, confirmed: true, source: 'manual' },
  { id: 'broccoli', name: 'Bông cải xanh', grams: 150, confirmed: true, source: 'manual' },
];
const generated = {
  name: 'Gà hấp bông cải',
  summary: 'Một món hấp nhẹ vị.',
  minutes: 25,
  difficulty: 'Dễ',
  ingredientIds: ['chicken', 'broccoli'],
  steps: [
    { id: 1, text: 'Sơ chế bông cải xanh và chuẩn bị ức gà trên dụng cụ riêng.' },
    {
      id: 2,
      text: 'Hấp gà đến nhiệt độ tâm 74°C, hấp bông cải chín và dọn ra đĩa.',
      durationSeconds: 900,
    },
  ],
};
function recipe(overrides = {}) {
  return reviewRecipe(
    {
      id: 'test-recipe',
      ...generated,
      ingredients,
      servings: 2,
      createdAt: 1000,
      model: 'test-fixture',
      profileSnapshot: profile,
      ...overrides,
    },
    overrides.profileSnapshot || profile,
  );
}
module.exports = { profile, ingredients, generated, recipe };
