require('fake-indexeddb/auto');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  db,
  saveRecipeToDB,
  saveProfileRevision,
  logCompletedMeal,
  getTodayCalories,
  getRecipeContext,
} = require('../src/lib/db.ts');
const { exportBackup, importBackup, parseBackup } = require('../src/lib/backup.ts');
const { recipe, profile } = require('./fixtures.cjs');

test('backup size limit counts UTF-8 bytes for Vietnamese and other Unicode data', () => {
  assert.throws(() => parseBackup('漢'.repeat(3_333_334)), /10 MB/);
});

test('database persistence, history, backups and portions', async (t) => {
  await db.delete();
  await db.open();
  const value = recipe();
  await t.test('saving twice updates one recipe, preserves feedback', async () => {
    await saveRecipeToDB(value);
    await db.recipes.update(value.id, { rating: 4, notes: 'Ít muối hơn', isFavorite: true });
    await saveRecipeToDB(value);
    assert.equal(await db.recipes.count(), 1);
    assert.equal((await db.recipes.get(value.id)).notes, 'Ít muối hơn');
    assert.equal((await getRecipeContext())[0].notes, 'Ít muối hơn');
  });
  await t.test('profile revisions are retained', async () => {
    await saveProfileRevision(profile);
    await saveProfileRevision({ ...profile, allergies: 'Trứng' });
    assert.equal(await db.profileRevisions.count(), 2);
  });
  await t.test('meal portions and idempotent completion', async () => {
    await logCompletedMeal(value, 'Bữa Tối', 1, 'session');
    await logCompletedMeal(value, 'Bữa Tối', 1, 'session');
    assert.equal(await db.mealLogs.count(), 1);
    assert.equal((await db.mealLogs.toArray())[0].calories, 146);
  });
  await t.test('daily totals include more than five meals', async () => {
    for (let i = 0; i < 6; i++) await logCompletedMeal(value, 'Bữa Phụ', 1, 'extra-' + i);
    const today = await getTodayCalories();
    assert.equal(today.mealCount, 7);
    assert.equal(today.totalCalories, 1022);
  });
  await t.test('backup round trip preserves records without duplicates', async () => {
    const text = JSON.stringify(await exportBackup(profile));
    assert.equal(parseBackup(text).recipes.length, 1);
    assert.equal(await importBackup(text, profile), 0);
    await db.recipes.clear();
    assert.equal(await importBackup(text, { ...profile, allergies: 'gà' }), 1);
    assert.equal((await db.recipes.get(value.id)).recipe.audit.hasRisk, true);
  });
  await t.test('invalid imports are atomic', async () => {
    const before = await db.recipes.count();
    await assert.rejects(importBackup('{"version":2}', profile));
    assert.equal(await db.recipes.count(), before);
  });
  await t.test('old records round trip as archives without becoming active recipes', async () => {
    const old = {
      id: 'legacy-1',
      title: 'Món cũ',
      createdAt: 1,
      recipe: { name: 'Món cũ', oldScore: 100 },
    };
    await db.recipes.put(old);
    const data = await exportBackup(profile);
    assert.equal(data.legacyArchive.length, 1);
    assert.equal(data.recipes.length, 1);
    await db.recipes.delete(old.id);
    await importBackup(JSON.stringify(data), profile);
    assert.equal(await db.recipes.get(old.id), undefined);
    assert.deepEqual((await exportBackup(profile)).legacyArchive[0].payload, old);
  });
  await db.delete();
});
