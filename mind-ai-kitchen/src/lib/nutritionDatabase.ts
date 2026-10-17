import type { Ingredient, NutritionSummary, SourceReference } from '../types/domain';
import { normalizeText } from './text';

// USDA FoodData Central SR Legacy records, retrieved and checked 2026-10-16.
// Values refer to 100 g edible portion in the exact preparation state shown.
export const FOOD_REFERENCES = [
  {
    id: 171077,
    name: 'Ức gà sống, bỏ da và xương',
    aliases: ['ức gà', 'ức gà sống'],
    calories: 120,
    protein: 22.5,
    fat: 2.62,
    carbs: 0,
  },
  {
    id: 170379,
    name: 'Bông cải xanh sống',
    aliases: ['bông cải xanh', 'súp lơ xanh', 'broccoli'],
    calories: 34,
    protein: 2.82,
    fat: 0.37,
    carbs: 6.64,
  },
  {
    id: 170457,
    name: 'Cà chua chín đỏ, còn sống',
    aliases: ['cà chua', 'cà chua sống'],
    calories: 18,
    protein: 0.88,
    fat: 0.2,
    carbs: 3.89,
  },
  {
    id: 171287,
    name: 'Trứng gà sống, bỏ vỏ',
    aliases: ['trứng gà', 'trứng'],
    calories: 143,
    protein: 12.56,
    fat: 9.51,
    carbs: 0.72,
  },
  {
    id: 168878,
    name: 'Cơm trắng hạt dài, đã nấu',
    aliases: ['cơm trắng', 'cơm'],
    calories: 130,
    protein: 2.69,
    fat: 0.28,
    carbs: 28.17,
  },
  {
    id: 172475,
    name: 'Đậu phụ cứng, kết tủa calcium sulfate',
    aliases: ['đậu phụ cứng', 'đậu hũ cứng'],
    calories: 144,
    protein: 17.27,
    fat: 8.72,
    carbs: 2.78,
  },
  {
    id: 172183,
    name: 'Lòng trắng trứng sống',
    aliases: ['lòng trắng trứng', 'lòng trắng trứng gà'],
    calories: 52,
    protein: 10.9,
    fat: 0.17,
    carbs: 0.73,
  },
  {
    id: 171413,
    name: 'Dầu ô liu',
    aliases: ['dầu ô liu', 'dầu olive'],
    calories: 884,
    protein: 0,
    fat: 100,
    carbs: 0,
  },
  {
    id: 170393,
    name: 'Cà rốt sống',
    aliases: ['cà rốt', 'cà rốt sống'],
    calories: 41,
    protein: 0.93,
    fat: 0.24,
    carbs: 9.58,
  },
  {
    id: 169975,
    name: 'Bắp cải sống',
    aliases: ['bắp cải', 'bắp cải sống'],
    calories: 25,
    protein: 1.28,
    fat: 0.1,
    carbs: 5.8,
  },
  {
    id: 168936,
    name: 'Mì Ý Spaghetti khô',
    aliases: ['mì ý', 'mì ý spaghetti', 'spaghetti', 'mì spaghetti', 'pasta'],
    calories: 371,
    protein: 13.04,
    fat: 1.51,
    carbs: 74.67,
  },
  {
    id: 170000,
    name: 'Hành tây sống',
    aliases: ['hành tây', 'củ hành tây', 'hành củ'],
    calories: 40,
    protein: 1.1,
    fat: 0.1,
    carbs: 9.34,
  },
  {
    id: 174036,
    name: 'Thịt bò hoặc thịt nạc xay sống',
    aliases: ['thịt xay', 'thịt bò xay', 'thịt heo xay', 'thịt lợn xay', 'thịt băm'],
    calories: 215,
    protein: 18.6,
    fat: 15,
    carbs: 0,
  },
  {
    id: 170460,
    name: 'Sốt cà chua đóng hộp / sốt Bolognese',
    aliases: ['sốt bolognese', 'sốt cà chua', 'sốt mì ý'],
    calories: 29,
    protein: 1.27,
    fat: 0.21,
    carbs: 7.21,
  },
  {
    id: 173468,
    name: 'Muối ăn tinh khiết',
    aliases: ['gia vị muối', 'muối', 'muối ăn', 'muối tinh'],
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
  },
  {
    id: 170026,
    name: 'Khoai tây sống',
    aliases: ['khoai tây', 'potato'],
    calories: 77,
    protein: 2.02,
    fat: 0.09,
    carbs: 17.47,
  },
  {
    id: 169230,
    name: 'Tỏi tươi',
    aliases: ['tỏi', 'tỏi sống', 'tỏi tươi', 'garlic'],
    calories: 149,
    protein: 6.36,
    fat: 0.5,
    carbs: 33.06,
  },
  {
    id: 175176,
    name: 'Tôm sống',
    aliases: ['tôm', 'tôm sú', 'tôm sống', 'tôm thẻ'],
    calories: 85,
    protein: 20.1,
    fat: 0.51,
    carbs: 0,
  },
  {
    id: 173686,
    name: 'Cá hồi Đại Tây Dương sống',
    aliases: ['cá hồi', 'cá hồi sống', 'salmon'],
    calories: 208,
    protein: 20.42,
    fat: 13.42,
    carbs: 0,
  },
];
export const SAFETY_SOURCES: SourceReference[] = [
  {
    title: 'FDA · Dị ứng thực phẩm',
    url: 'https://www.fda.gov/food/food-labeling-nutrition/food-allergies-what-you-need-know',
    note: 'Đọc nhãn thực phẩm và kiểm tra chất gây dị ứng, kể cả gia vị.',
  },
  {
    title: 'FoodSafety.gov · Nhiệt độ nấu tối thiểu',
    url: 'https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures',
    note: 'Dùng nhiệt kế thực phẩm; xem hướng dẫn theo từng loại thịt, cá và món trứng.',
  },
];
const round = (value: number) => Math.round(value * 10) / 10;
export function calculateNutrition(ingredients: Ingredient[]): NutritionSummary {
  const items: NutritionSummary['items'] = [];
  const missing: string[] = [];
  for (const ingredient of ingredients) {
    const ref = FOOD_REFERENCES.find((r) =>
      [...r.aliases, r.name].some((a) => normalizeText(a) === normalizeText(ingredient.name)),
    );
    if (!ref || !ingredient.grams || ingredient.grams <= 0) {
      missing.push(ingredient.name);
      continue;
    }
    const ratio = ingredient.grams / 100;
    items.push({
      name: ingredient.name,
      grams: ingredient.grams,
      calories: round(ref.calories * ratio),
      macros: {
        protein: round(ref.protein * ratio),
        carbs: round(ref.carbs * ratio),
        fat: round(ref.fat * ratio),
      },
      source: {
        title: 'USDA FDC ' + ref.id,
        url: 'https://fdc.nal.usda.gov/food-details/' + ref.id + '/nutrients',
        note: ref.name + ' · dữ liệu trên 100 g phần ăn được; đối chiếu 16/10/2026.',
      },
    });
  }
  const complete = ingredients.length > 0 && missing.length === 0;
  return {
    complete,
    matched: items.length,
    total: ingredients.length,
    items,
    missing,
    calories: complete ? Math.round(items.reduce((s, i) => s + i.calories, 0)) : null,
    macros: complete
      ? {
          protein: round(items.reduce((s, i) => s + i.macros.protein, 0)),
          carbs: round(items.reduce((s, i) => s + i.macros.carbs, 0)),
          fat: round(items.reduce((s, i) => s + i.macros.fat, 0)),
        }
      : null,
  };
}
