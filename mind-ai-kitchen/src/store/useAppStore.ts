import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
    bodyType: string;
    goal: string;
    allergies: string;
    preferences: string;
}

export interface Ingredient {
    id: string;
    name: string;
}

export interface Macro {
    protein: number;
    carbs: number;
    fat: number;
}

export interface RecipeStep {
    id: number;
    text: string;
    timestamp?: string;
}

export interface RecipeResult {
    name: string;
    calories: number;
    time: string;
    difficulty: "Dễ" | "Vừa" | "Khó" | string;
    ai_verdict: string;
    servings: number;
    macros: Macro;
    ingredients: string[];
    suggestedAdditions?: string[];
    steps: RecipeStep[];
}

interface AppState {
    profile: UserProfile;
    setProfile: (profile: Partial<UserProfile>) => void;

    scannedIngredients: Ingredient[];
    setScannedIngredients: (ingredients: Ingredient[]) => void;
    addIngredient: (ingredient: Ingredient) => void;
    removeIngredient: (id: string) => void;

    currentRecipe: RecipeResult | null;
    setCurrentRecipe: (recipe: RecipeResult | null) => void;

    clearData: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            profile: {
                bodyType: '',
                goal: '',
                allergies: '',
                preferences: '',
            },
            setProfile: (newProfile) =>
                set((state) => ({ profile: { ...state.profile, ...newProfile } })),

            scannedIngredients: [],
            setScannedIngredients: (ingredients) => set({ scannedIngredients: ingredients }),
            addIngredient: (ingredient) =>
                set((state) => ({ scannedIngredients: [...state.scannedIngredients, ingredient] })),
            removeIngredient: (id) =>
                set((state) => ({ scannedIngredients: state.scannedIngredients.filter(i => i.id !== id) })),

            currentRecipe: null,
            setCurrentRecipe: (recipe) => set({ currentRecipe: recipe }),

            clearData: () => set({
                scannedIngredients: [],
                currentRecipe: null
            })
        }),
        {
            name: 'mind-ai-kitchen-storage',
        }
    )
);
