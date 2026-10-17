import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Ingredient, RecipeResult, UserProfile } from '../types/domain';
import { profileSchema, ingredientSchema, storedRecipeSchema } from '../lib/schemas';
import { reviewRecipe } from '../lib/recipe-review';
export type * from '../types/domain';

export const defaultProfile: UserProfile = {
  bodyType: '',
  goal: 'health',
  allergies: '',
  preferences: '',
};
export let hydrationIssue = '';
interface AppState {
  profile: UserProfile;
  setProfile: (value: UserProfile) => void;
  scannedIngredients: Ingredient[];
  setScannedIngredients: (value: Ingredient[]) => void;
  currentRecipe: RecipeResult | null;
  setCurrentRecipe: (value: RecipeResult | null) => void;
  clearData: () => void;
}
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      setProfile: (profile) => set({ profile }),
      scannedIngredients: [],
      setScannedIngredients: (scannedIngredients) => set({ scannedIngredients }),
      currentRecipe: null,
      setCurrentRecipe: (currentRecipe) => set({ currentRecipe }),
      clearData: () =>
        set({ profile: defaultProfile, scannedIngredients: [], currentRecipe: null }),
    }),
    {
      name: 'mind-ai-kitchen-storage',
      version: 2,
      onRehydrateStorage: () => (_state, error) => {
        if (error)
          hydrationIssue =
            'Chưa đọc được dữ liệu đã lưu. Hãy kiểm tra lại hồ sơ dị ứng trước khi tạo món và quyền lưu trữ của trình duyệt.';
      },
      merge: (persisted, current) => {
        const value = (persisted || {}) as Partial<AppState>;
        const profile = profileSchema.safeParse(value.profile || defaultProfile);
        if (!profile.success)
          hydrationIssue =
            'Hồ sơ đã lưu không hợp lệ. Hãy nhập lại đầy đủ thông tin dị ứng trước khi tạo món.';
        const checkedProfile = profile.success ? profile.data : defaultProfile;
        const ingredients = ingredientSchema
          .array()
          .max(30)
          .safeParse(value.scannedIngredients || []);
        const recipe = storedRecipeSchema.safeParse(value.currentRecipe);
        return {
          ...current,
          profile: checkedProfile,
          scannedIngredients: ingredients.success ? ingredients.data : [],
          currentRecipe: recipe.success ? reviewRecipe(recipe.data, checkedProfile) : null,
        };
      },
      migrate: (persisted) => {
        const old = persisted as Partial<AppState>;
        return {
          profile: { ...defaultProfile, ...old?.profile },
          scannedIngredients: [],
          currentRecipe: null,
        };
      },
    },
  ),
);
