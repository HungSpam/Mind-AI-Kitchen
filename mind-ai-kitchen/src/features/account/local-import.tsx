'use client';

import { useEffect, useState } from 'react';
import { CloudUpload, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import type { Json } from '@/lib/supabase/database';

type Counts = { recipes: number; meals: number };
async function stableCloudId(userId: string, kind: string, localId: string) {
  const input = new TextEncoder().encode(`${userId}:${kind}:${localId}`);
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', input)).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function iso(value: number) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Có dữ liệu ngày tháng không hợp lệ.');
  return date.toISOString();
}

export function LocalDataImport({ userId }: { userId: string }) {
  const profile = useAppStore((state) => state.profile);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      db.recipes.count(), db.mealLogs.count(),
      db.cloudSyncStates.get(userId),
    ]).then(([recipes, meals, state]) => {
      if (!active) return;
      setCounts({ recipes, meals });
      setComplete(Boolean(state?.importCompletedAt));
    }).catch(() => { if (active) setError('Không đọc được dữ liệu trên thiết bị.'); });
    return () => { active = false; };
  }, [userId]);

  async function importLocalData() {
    if (!confirmed || busy || complete) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const client = createClient();
      if (!client) throw new Error('Supabase chưa được cấu hình trên môi trường này.');
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError || auth.user?.id !== userId) throw new Error('Phiên đăng nhập đã đổi. Hãy tải lại trang tài khoản.');

      const [recipes, meals] = await Promise.all([
        db.recipes.toArray(), db.mealLogs.toArray(),
      ]);
      const mappedId = async (kind: string, localId: string) => {
        const id = `${userId}:${kind}:${localId}`;
        const found = await db.cloudSyncKeys.get(id);
        if (found) return found.cloudId;
        const cloudId = await stableCloudId(userId, kind, localId);
        await db.cloudSyncKeys.add({ id, userId, kind, localId, cloudId });
        return cloudId;
      };

      const recipeIds = new Map<string, string>();
      const cloudRecipes = await Promise.all(recipes.map(async (record) => {
        const cloudId = await mappedId('recipe', record.id);
        recipeIds.set(record.id, cloudId);
        const recipeJson = JSON.stringify(record.recipe);
        if (new TextEncoder().encode(recipeJson).byteLength > 190_000) throw new Error(`Công thức “${record.title}” quá lớn để chuyển.`);
        return {
          id: cloudId, owner_id: userId, title: record.title.slice(0, 150),
          recipe: record.recipe as unknown as Json, is_favorite: record.isFavorite,
          source: 'imported' as const, created_at: iso(record.createdAt), updated_at: iso(record.updatedAt),
        };
      }));
      for (let offset = 0; offset < cloudRecipes.length; offset += 50) {
        const { error: writeError } = await client.from('recipes').upsert(cloudRecipes.slice(offset, offset + 50), { onConflict: 'id' });
        if (writeError) throw new Error('Chưa sao chép được công thức. Dữ liệu local vẫn được giữ và có thể thử lại.');
      }

      const feedback = recipes.filter((record) => record.rating || record.notes).map((record) => ({
        user_id: userId, recipe_id: recipeIds.get(record.id)!, rating: record.rating ?? null,
        notes: record.notes?.slice(0, 500) ?? null, reason_tags: [],
      }));
      for (let offset = 0; offset < feedback.length; offset += 50) {
        const { error: writeError } = await client.from('recipe_feedback').upsert(feedback.slice(offset, offset + 50), { onConflict: 'user_id,recipe_id' });
        if (writeError) throw new Error('Chưa sao chép được ghi chú/đánh giá. Dữ liệu local vẫn được giữ và có thể thử lại.');
      }

      const savedRecipes = new Map(recipes.map((record) => [record.id, record.recipe]));
      const cloudMeals = await Promise.all(meals.map(async (meal) => {
        const id = await mappedId('meal', meal.id);
        const recipeId = meal.recipeId ? recipeIds.get(meal.recipeId) ?? null : null;
        const snapshot = (meal.recipeId && savedRecipes.get(meal.recipeId)) || {
          name: meal.recipeName, nutrition: { calories: meal.calories, macros: meal.macros },
        };
        return {
          id, owner_id: userId, cooking_session_id: null, recipe_id: recipeId,
          recipe_snapshot: snapshot as unknown as Json, servings: meal.servings,
          meal_type: meal.mealType, consumed_at: iso(meal.consumedAt), calories: meal.calories,
          macros: meal.macros as unknown as Json,
        };
      }));
      for (let offset = 0; offset < cloudMeals.length; offset += 50) {
        const { error: writeError } = await client.from('meal_logs').upsert(cloudMeals.slice(offset, offset + 50), { onConflict: 'id' });
        if (writeError) throw new Error('Chưa sao chép được nhật ký. Dữ liệu local vẫn được giữ và có thể thử lại.');
      }

      const { data: cloudProfile, error: readProfileError } = await client.from('profiles')
        .select('allergies,goal,preferences').eq('user_id', userId).maybeSingle();
      if (readProfileError) throw new Error('Chưa kiểm tra được hồ sơ trên tài khoản.');
      if (!cloudProfile) throw new Error('Hồ sơ tài khoản chưa sẵn sàng. Dữ liệu local vẫn được giữ và có thể thử lại.');
      const cloudProfileIsDefault = cloudProfile && !cloudProfile.allergies && !cloudProfile.preferences && cloudProfile.goal === 'health';
      const localProfileHasValues = Boolean(profile.allergies || profile.preferences || profile.goal !== 'health');
      let profileConflict = false;
      if (cloudProfileIsDefault && localProfileHasValues) {
        const { error: profileError } = await client.from('profiles').update({
          allergies: profile.allergies, goal: profile.goal, preferences: profile.preferences,
        }).eq('user_id', userId);
        if (profileError) throw new Error('Chưa sao chép được hồ sơ khẩu vị.');
      } else if (localProfileHasValues && !cloudProfileIsDefault && (
        cloudProfile.allergies !== profile.allergies || cloudProfile.preferences !== profile.preferences || cloudProfile.goal !== profile.goal
      )) profileConflict = true;

      await db.cloudSyncStates.put({ userId, importCompletedAt: Date.now() });
      setComplete(true);
      setMessage(`Đã sao chép ${recipes.length} công thức, ${meals.length} bữa ăn và ${feedback.length} phản hồi. Dữ liệu trên thiết bị vẫn được giữ.${profileConflict ? ' Hồ sơ cloud khác hồ sơ local nên được giữ nguyên.' : ''}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể sao chép dữ liệu. Thử lại sau.');
    } finally { setBusy(false); }
  }

  if (!counts) return <p role="status">Đang kiểm tra dữ liệu trên thiết bị…</p>;
  return <section className="panel account-panel local-import">
    <div className="account-status-icon"><CloudUpload size={21} /></div>
    <h2>{complete ? 'Đã sao chép lần đầu' : 'Sao chép dữ liệu trên thiết bị'}</h2>
    <p>{counts.recipes} công thức · {counts.meals} bữa ăn</p>
    <p>Chỉ chuyển nội dung lên tài khoản đang đăng nhập. Bản local không bị xóa. Lần này chưa bật đồng bộ tự động giữa thiết bị.</p>
    {!complete && <label className="check local-import-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Tôi đồng ý sao chép công thức, nhật ký và hồ sơ khẩu vị lên tài khoản này.</span></label>}
    {!complete && <button className="btn full" type="button" disabled={!confirmed || busy} onClick={importLocalData}><ShieldCheck size={18} />{busy ? 'Đang sao chép…' : 'Sao chép dữ liệu lần đầu'}</button>}
    {message && <p className="account-message" role="status">{message}</p>}
    {error && <p className="account-message is-error" role="alert">{error}</p>}
  </section>;
}
