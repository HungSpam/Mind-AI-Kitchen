export interface UserProfile {
  bodyType: string;
  goal: string;
  allergies: string;
  preferences: string;
  updatedAt?: number;
}

export interface Ingredient {
  id: string;
  name: string;
  grams?: number;
  confirmed: boolean;
  source: 'manual' | 'photo';
  box2d?: [number, number, number, number];
}

export interface RecipeStep {
  id: number;
  text: string;
  durationSeconds?: number;
}

export interface Macro {
  protein: number;
  carbs: number;
  fat: number;
}
export interface SourceReference {
  title: string;
  url: string;
  note: string;
}
export interface AllergenFlag {
  ingredient: string;
  group: string;
  keyword: string;
}
export interface AllergenAudit {
  hasRisk: boolean;
  flags: AllergenFlag[];
  checkedAt: number;
}
export interface NutritionItem {
  name: string;
  grams: number;
  calories: number;
  macros: Macro;
  source: SourceReference;
}
export interface NutritionSummary {
  complete: boolean;
  matched: number;
  total: number;
  calories: number | null;
  macros: Macro | null;
  items: NutritionItem[];
  missing: string[];
}
export interface RecipeCheck {
  label: string;
  passed: boolean;
  detail: string;
}
export interface RecipeResult {
  id: string;
  name: string;
  summary: string;
  servings: number;
  minutes: number;
  difficulty: 'Dễ' | 'Vừa' | 'Khó';
  ingredients: Ingredient[];
  steps: RecipeStep[];
  createdAt: number;
  model: string;
  profileSnapshot: UserProfile;
  nutrition: NutritionSummary;
  audit: AllergenAudit;
  checks: RecipeCheck[];
  sources: SourceReference[];
}

export interface SavedRecipeRecord {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  recipe: RecipeResult;
  isFavorite: boolean;
  rating?: number;
  notes?: string;
}
export type MealType = 'Bữa Sáng' | 'Bữa Trưa' | 'Bữa Tối' | 'Bữa Phụ';
export interface MealHistoryLog {
  id: string;
  recipeId?: string;
  recipeName: string;
  calories: number | null;
  servings: number;
  mealType: MealType;
  consumedAt: number;
  macros: Macro | null;
}
export interface ProfileRevision {
  id: string;
  createdAt: number;
  profile: UserProfile;
}
