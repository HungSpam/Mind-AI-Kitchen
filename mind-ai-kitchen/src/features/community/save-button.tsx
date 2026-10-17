'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { z } from 'zod';
import { BookmarkCheck, BookmarkPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import { storedRecipeSchema } from '@/lib/schemas';
import { reviewRecipe } from '@/lib/recipe-review';
import { useAppStore } from '@/store/useAppStore';

export function CommunitySaveButton({ postId, signedIn, initialSaved, savedRecipeId }: { postId: string; signedIn: boolean; initialSaved: boolean; savedRecipeId: string | null }) {
  const profile = useAppStore((state) => state.profile);
  const [saved, setSaved] = useState(initialSaved);
  const [localReady, setLocalReady] = useState(false);
  const localRecipe = useLiveQuery(() => savedRecipeId ? db.recipes.get(savedRecipeId) : undefined, [savedRecipeId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (busy || (saved && (localReady || Boolean(localRecipe)))) return;
    setBusy(true); setError('');
    try {
      const client = createClient();
      if (!client) throw new Error('Chưa kết nối Supabase.');
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError || !auth.user) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
      const { data: recipeId, error: saveError } = await client.rpc('save_community_post', { p_post_id: postId });
      if (saveError || !recipeId) throw new Error('Chưa lưu được công thức. Thử lại sau.');
      const { data: cloudRecipe, error: readError } = await client.from('recipes').select('id,title,recipe').eq('id', recipeId).single();
      if (readError || !cloudRecipe) throw new Error('Đã lưu trên tài khoản nhưng chưa tải được bản để dùng trên thiết bị này.');
      const parsed = storedRecipeSchema.safeParse(cloudRecipe.recipe);
      if (!parsed.success) throw new Error('Công thức cộng đồng chưa đúng định dạng để mở trong sổ món.');
      const checkedSources = z.array(z.object({ title: z.string().max(200), url: z.string().url().max(1000), note: z.string().max(500) })).max(20).safeParse(
        cloudRecipe.recipe && typeof cloudRecipe.recipe === 'object' && !Array.isArray(cloudRecipe.recipe) ? cloudRecipe.recipe.sources : [],
      );
      const sharedSources = checkedSources.success ? checkedSources.data.filter((source) => { try { return new URL(source.url).protocol === 'https:'; } catch { return false; } }) : [];
      const reviewed = reviewRecipe(parsed.data, profile);
      const recipe = { ...reviewed, sources: sharedSources.length ? sharedSources : reviewed.sources };
      const old = await db.recipes.get(recipe.id);
      await db.recipes.put({
        id: recipe.id, title: recipe.name, createdAt: old?.createdAt ?? recipe.createdAt,
        updatedAt: Date.now(), recipe, isFavorite: true, rating: old?.rating, notes: old?.notes,
      });
      setLocalReady(true);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa lưu được công thức.');
    } finally { setBusy(false); }
  }

  if (!signedIn) return <Link className="btn" href="/account">Đăng nhập để lưu món</Link>;
  return <div className="community-save">
    <button className="btn" type="button" disabled={busy || (saved && (localReady || Boolean(localRecipe)))} onClick={save}>
      {saved && (localReady || localRecipe) ? <BookmarkCheck size={18} /> : <BookmarkPlus size={18} />}
      {busy ? 'Đang lưu…' : saved && (localReady || localRecipe) ? 'Đã lưu vào sổ món' : saved ? 'Mở trên thiết bị này' : 'Lưu vào sổ món'}
    </button>
    {error && <p className="account-message is-error" role="alert">{error}</p>}
  </div>;
}
