import Dexie, { type Table } from 'dexie';
import type {
  RecipeResult,
  SavedRecipeRecord,
  MealHistoryLog,
  MealType,
  UserProfile,
  ProfileRevision,
} from '../types/domain';
export type { SavedRecipeRecord, MealHistoryLog } from '../types/domain';

export class MindKitchenDatabase extends Dexie {
  recipes!: Table<SavedRecipeRecord, string>;
  mealLogs!: Table<MealHistoryLog, string>;
  profileRevisions!: Table<ProfileRevision, string>;
  legacyArchive!: Table<
    { id: string; kind: 'recipe' | 'meal' | 'profile'; payload: unknown },
    string
  >;
  cloudSyncKeys!: Table<{ id: string; userId: string; kind: string; localId: string; cloudId: string }, string>;
  cloudSyncStates!: Table<{ userId: string; importCompletedAt?: number }, string>;
  constructor(name = 'MindKitchenDB') {
    super(name);
    this.version(1).stores({
      recipes: 'id, title, createdAt, isFavorite',
      mealLogs: 'id, consumedAt, mealType, recipeName',
    });
    this.version(2).stores({
      recipes: 'id, title, createdAt, updatedAt',
      mealLogs: 'id, consumedAt, mealType, recipeName, recipeId',
      profileRevisions: 'id, createdAt',
    });
    this.version(3).stores({ legacyArchive: 'id, kind' });
    this.version(4).stores({
      cloudSyncKeys: 'id, userId, kind, localId',
      cloudSyncStates: 'userId, importCompletedAt',
    });
  }
}
export const db = new MindKitchenDatabase();
export async function saveRecipeToDB(recipe: RecipeResult): Promise<string> {
  const old = await db.recipes.get(recipe.id);
  await db.recipes.put({
    id: recipe.id,
    title: recipe.name,
    createdAt: old?.createdAt || recipe.createdAt,
    updatedAt: Date.now(),
    recipe,
    isFavorite: old?.isFavorite || false,
    rating: old?.rating,
    notes: old?.notes,
  });
  return recipe.id;
}
export async function saveProfileRevision(profile: UserProfile) {
  await db.profileRevisions.add({ id: crypto.randomUUID(), createdAt: Date.now(), profile });
}
export async function logCompletedMeal(
  recipe: RecipeResult,
  mealType: MealType,
  servings: number,
  sessionId: string,
): Promise<string> {
  if (!Number.isFinite(servings) || servings <= 0 || servings > recipe.servings)
    throw new Error('Khẩu phần không hợp lệ.');
  // Stable cooking session ID makes a repeated completion click idempotent.
  const id = 'meal_' + sessionId;
  const ratio = servings / recipe.servings;
  const macros = recipe.nutrition.macros;
  await db.mealLogs.put({
    id,
    recipeId: recipe.id,
    recipeName: recipe.name,
    calories:
      recipe.nutrition.calories === null ? null : Math.round(recipe.nutrition.calories * ratio),
    servings,
    mealType,
    consumedAt: Date.now(),
    macros: macros
      ? { protein: macros.protein * ratio, carbs: macros.carbs * ratio, fat: macros.fat * ratio }
      : null,
  });
  return id;
}
export async function getTodayCalories() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const logs = await db.mealLogs
    .where('consumedAt')
    .between(start.getTime(), end.getTime(), true, false)
    .toArray();
  return {
    totalCalories: logs.reduce((sum, log) => sum + (log.calories || 0), 0),
    mealCount: logs.length,
    incomplete: logs.some((log) => log.calories === null),
  };
}
export async function getRecipeContext() {
  const records = await db.recipes.orderBy('updatedAt').reverse().limit(30).toArray();
  return records
    .filter((r) => r.rating || r.notes)
    .slice(0, 5)
    .map((r) => ({ name: r.title.slice(0, 150), rating: r.rating, notes: r.notes?.slice(0, 500) }));
}
