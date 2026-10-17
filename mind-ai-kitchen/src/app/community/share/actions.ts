'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const shareSchema = z.object({
  title: z.string().trim().min(3).max(150),
  summary: z.string().trim().max(500).default(''),
  servings: z.coerce.number().int().min(1).max(12),
  minutes: z.coerce.number().int().min(1).max(240),
  difficulty: z.enum(['Dễ', 'Vừa', 'Khó']),
  ingredients: z.array(z.object({ name: z.string().trim().min(2).max(100), grams: z.number().positive().max(10000).optional() })).min(1).max(30),
  steps: z.array(z.object({ text: z.string().trim().min(10).max(1200), durationSeconds: z.number().int().min(0).max(14400).optional() })).min(2).max(12),
  nutrition: z.object({ calories: z.number().nonnegative().nullable(), macros: z.object({ protein: z.number().nonnegative(), carbs: z.number().nonnegative(), fat: z.number().nonnegative() }).nullable() }).nullable().optional(),
  sources: z.array(z.object({ title: z.string().max(200), url: z.string().url().max(1000), note: z.string().max(500) })).max(10).default([]),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});

export type ShareActionState = { status: 'idle' | 'error' | 'success'; message: string };

export async function submitRecipeForReview(_previous: ShareActionState, formData: FormData): Promise<ShareActionState> {
  if (formData.get('share_publicly') !== 'yes') return { status: 'error', message: 'Xác nhận quyền chia sẻ công khai trước khi gửi.' };
  const rawRecipe = formData.get('recipe');
  const displayName = String(formData.get('display_name') || '').trim();
  if (typeof rawRecipe !== 'string' || rawRecipe.length > 180_000) return { status: 'error', message: 'Dữ liệu công thức không hợp lệ hoặc quá lớn.' };
  if (displayName.length < 1 || displayName.length > 40) return { status: 'error', message: 'Tên hiển thị cần từ 1 đến 40 ký tự.' };

  let payload: unknown;
  try {
    const base = JSON.parse(rawRecipe) as Record<string, unknown>;
    payload = { ...base, title: String(formData.get('title') || ''), summary: String(formData.get('summary') || '') };
  }
  catch { return { status: 'error', message: 'Không đọc được dữ liệu công thức.' }; }
  const parsed = shareSchema.safeParse(payload);
  if (!parsed.success) return { status: 'error', message: 'Công thức cần có tên, nguyên liệu và ít nhất hai bước nấu hợp lệ.' };

  const supabase = await createClient();
  if (!supabase) return { status: 'error', message: 'Chưa cấu hình dịch vụ tài khoản.' };
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = typeof auth?.claims?.sub === 'string' ? auth.claims.sub : null;
  if (authError || !userId) return { status: 'error', message: 'Hãy đăng nhập để gửi công thức.' };

  const { error: profileError } = await supabase.from('public_profiles').upsert({ user_id: userId, display_name: displayName });
  if (profileError) return { status: 'error', message: 'Chưa lưu được tên hiển thị. Thử lại sau.' };
  const recipe = parsed.data;
  const { data: post, error: postError } = await supabase.from('community_posts').insert({
    author_id: userId, title: recipe.title, summary: recipe.summary,
    servings: recipe.servings, minutes: recipe.minutes, difficulty: recipe.difficulty,
    ingredients: recipe.ingredients, steps: recipe.steps, nutrition: recipe.nutrition ?? null,
    sources: recipe.sources, tags: recipe.tags, status: 'draft',
  }).select('id').single();
  if (postError || !post) return { status: 'error', message: 'Chưa tạo được bản nháp. Dữ liệu local vẫn được giữ.' };
  const { error: reviewError } = await supabase.rpc('request_community_review', { post_id: post.id });
  if (reviewError) return { status: 'success', message: 'Đã lưu bản nháp riêng nhưng chưa gửi được vào hàng chờ duyệt. Công thức chưa công khai; bạn có thể gửi lại trong mục Bài của tôi.' };
  return { status: 'success', message: 'Đã gửi công thức vào hàng chờ duyệt. Công thức chỉ xuất hiện công khai sau khi được duyệt.' };
}
