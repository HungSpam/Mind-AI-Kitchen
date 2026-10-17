import { z } from 'zod';

export const profileSchema = z.object({
  bodyType: z.string().max(40).default(''),
  goal: z.string().max(80).default('health'),
  allergies: z.string().max(500).default(''),
  preferences: z.string().max(500).default(''),
  updatedAt: z.number().optional(),
});
export const ingredientSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(2).max(100),
  grams: z.number().positive().max(10000).optional(),
  confirmed: z.boolean(),
  source: z.enum(['manual', 'photo']),
  box2d: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
});
export const recipeRequestSchema = z
  .object({
    profile: profileSchema,
    ingredients: z.array(ingredientSchema).min(1).max(30),
    servings: z.number().int().min(1).max(12),
    context: z
      .array(
        z.object({
          name: z.string().max(150),
          rating: z.number().min(1).max(5).optional(),
          notes: z.string().max(500).optional(),
        }),
      )
      .max(5)
      .default([]),
  })
  .refine(
    (v) => v.ingredients.every((i) => i.confirmed),
    'Hãy xác nhận tất cả nguyên liệu trước khi tạo món.',
  );
export const generatedRecipeSchema = z.object({
  name: z.string().trim().min(3).max(150),
  summary: z.string().max(600),
  minutes: z.number().int().min(1).max(240),
  difficulty: z.enum(['Dễ', 'Vừa', 'Khó']),
  ingredientIds: z.array(z.string()).min(1).max(30),
  steps: z
    .array(
      z.object({
        id: z.number().int().positive(),
        text: z.string().trim().min(10).max(1200),
        durationSeconds: z.number().int().min(0).max(14400).optional(),
      }),
    )
    .min(2)
    .max(12),
});
export const visionRequestSchema = z.object({
  imageBase64: z
    .string()
    .max(3_000_000)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/),
});
export const storedRecipeSchema = generatedRecipeSchema.omit({ ingredientIds: true }).extend({
  id: z.string().min(1).max(100),
  ingredients: z.array(ingredientSchema).min(1).max(30),
  servings: z.number().int().min(1).max(12),
  createdAt: z.number().nonnegative(),
  model: z.string().max(100),
  profileSnapshot: profileSchema,
});
export const visionResponseSchema = z.object({
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(100),
        box2d: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
      }),
    )
    .max(30),
});
