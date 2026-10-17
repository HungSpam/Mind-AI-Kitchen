import type { RecipeResult, UserProfile } from '../types/domain';
import { scanAllergens } from './allergenSynonyms';
import { calculateNutrition, SAFETY_SOURCES } from './nutritionDatabase';

export type RecipeDraft = Omit<RecipeResult, 'audit' | 'nutrition' | 'sources' | 'checks'>;
export function reviewRecipe(recipe: RecipeDraft, profile: UserProfile): RecipeResult {
  const audit = scanAllergens(
    [
      recipe.name,
      recipe.summary,
      ...recipe.ingredients.map((i) => i.name),
      ...recipe.steps.map((s) => s.text),
    ],
    profile.allergies,
  );
  const nutrition = calculateNutrition(recipe.ingredients);
  return {
    ...recipe,
    audit,
    nutrition,
    sources: SAFETY_SOURCES,
    checks: [
      {
        label: 'Đối chiếu dị ứng',
        passed: !audit.hasRisk,
        detail: audit.hasRisk
          ? 'Có thành phần xung đột. Cần tạo lại công thức.'
          : 'Chưa tìm thấy từ khóa xung đột với hồ sơ hiện tại. Vẫn cần kiểm tra nhãn.',
      },
      {
        label: 'Nguyên liệu đã xác nhận',
        passed: recipe.ingredients.every((i) => i.confirmed),
        detail: 'Nguyên liệu và định lượng do bạn kiểm tra trước khi tạo món.',
      },
      {
        label: 'Dữ liệu dinh dưỡng',
        passed: nutrition.complete,
        detail:
          nutrition.matched +
          '/' +
          nutrition.total +
          ' nguyên liệu có định lượng và bản ghi tham chiếu phù hợp.',
      },
      {
        label: 'Các bước nấu',
        passed: recipe.steps.length >= 2,
        detail: recipe.steps.length + ' bước. Chưa được đầu bếp kiểm chứng thực nghiệm.',
      },
    ],
  };
}
