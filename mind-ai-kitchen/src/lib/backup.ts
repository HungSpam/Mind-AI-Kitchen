import { z } from 'zod';
import { db } from './db';
import { profileSchema, storedRecipeSchema } from './schemas';
import { reviewRecipe } from './recipe-review';
import type { UserProfile } from '../types/domain';

const recordSchema = z
  .object({
    id: z.string().min(1).max(100),
    title: z.string().max(150),
    createdAt: z.number(),
    updatedAt: z.number(),
    recipe: storedRecipeSchema,
    isFavorite: z.boolean(),
    rating: z.number().int().min(1).max(5).optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((r) => r.id === r.recipe.id, 'Mã công thức không khớp.');
const mealSchema = z.object({
  id: z.string().min(1).max(150),
  recipeId: z.string().max(100).optional(),
  recipeName: z.string().max(150),
  calories: z.number().nonnegative().nullable(),
  servings: z.number().positive().max(12),
  mealType: z.enum(['Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Bữa Phụ']),
  consumedAt: z.number().nonnegative(),
  macros: z
    .object({
      protein: z.number().nonnegative(),
      carbs: z.number().nonnegative(),
      fat: z.number().nonnegative(),
    })
    .nullable(),
});
const revisionSchema = z.object({
  id: z.string().max(100),
  createdAt: z.number(),
  profile: profileSchema,
});
const archiveSchema = z.object({
  id: z.string().max(200),
  kind: z.enum(['recipe', 'meal', 'profile']),
  payload: z.unknown(),
});
export const backupSchema = z.object({
  version: z.literal(2),
  exportedAt: z.number(),
  profile: profileSchema,
  recipes: z.array(recordSchema).max(2000),
  meals: z.array(mealSchema).max(10000),
  profileRevisions: z.array(revisionSchema).max(2000),
  legacyArchive: z.array(archiveSchema).max(14000).default([]),
});
export async function exportBackup(profile: UserProfile) {
  return db.transaction(
    'r',
    [db.recipes, db.mealLogs, db.profileRevisions, db.legacyArchive],
    async () => {
      const archive = new Map((await db.legacyArchive.toArray()).map((item) => [item.id, item]));
      function separate<T extends { id: string }>(
        items: T[],
        schema: z.ZodType,
        kind: 'recipe' | 'meal' | 'profile',
      ) {
        return items.filter((item) => {
          if (schema.safeParse(item).success) return true;
          const id = kind + '_' + item.id;
          archive.set(id, { id, kind, payload: item });
          return false;
        });
      }
      const data = {
        version: 2,
        exportedAt: Date.now(),
        profile,
        recipes: separate(await db.recipes.toArray(), recordSchema, 'recipe'),
        meals: separate(await db.mealLogs.toArray(), mealSchema, 'meal'),
        profileRevisions: separate(await db.profileRevisions.toArray(), revisionSchema, 'profile'),
        legacyArchive: [...archive.values()],
      };
      // Ensure every exported file can be imported by this version.
      backupSchema.parse(data);
      if (new TextEncoder().encode(JSON.stringify(data)).byteLength > 10_000_000)
        throw new Error('Bản sao lưu vượt giới hạn 10 MB.');
      return data;
    },
  );
}
export function parseBackup(text: string) {
  if (new TextEncoder().encode(text).byteLength > 10_000_000)
    throw new Error('Tệp sao lưu quá lớn (tối đa 10 MB).');
  const data = backupSchema.safeParse(JSON.parse(text));
  if (!data.success)
    throw new Error(
      'Tệp không phải bản sao lưu Mind Kitchen v2 hợp lệ. Dữ liệu hiện tại chưa thay đổi.',
    );
  return data.data;
}
export async function importBackup(text: string, currentProfile: UserProfile) {
  const data = parseBackup(text);
  // Merge only new IDs. Existing feedback/profile are never silently overwritten.
  return db.transaction(
    'rw',
    [db.recipes, db.mealLogs, db.profileRevisions, db.legacyArchive],
    async () => {
      let count = 0;
      for (const record of data.recipes)
        if (!(await db.recipes.get(record.id))) {
          const recipe = reviewRecipe(record.recipe, currentProfile);
          await db.recipes.add({ ...record, recipe });
          count++;
        }
      for (const meal of data.meals)
        if (!(await db.mealLogs.get(meal.id))) await db.mealLogs.add(meal);
      for (const revision of data.profileRevisions)
        if (!(await db.profileRevisions.get(revision.id))) await db.profileRevisions.add(revision);
      for (const record of data.legacyArchive)
        if (!(await db.legacyArchive.get(record.id))) await db.legacyArchive.add(record);
      await db.profileRevisions.put({
        id: 'import_' + data.exportedAt,
        createdAt: data.exportedAt,
        profile: data.profile,
      });
      return count;
    },
  );
}
