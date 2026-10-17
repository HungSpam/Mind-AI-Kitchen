'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { Share2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { submitRecipeForReview, type ShareActionState } from '@/app/community/share/actions';

const initialState: ShareActionState = { status: 'idle', message: '' };

export function ShareRecipeForm({ signedIn, recipeId }: { signedIn: boolean; recipeId: string }) {
  const record = useLiveQuery(() => recipeId ? db.recipes.get(recipeId) : undefined, [recipeId]);
  const [displayName, setDisplayName] = useState('Bếp nhà mình');
  const [state, action, pending] = useActionState(submitRecipeForReview, initialState);

  if (!signedIn) return <section className="panel empty"><h2>Đăng nhập để chia sẻ</h2><p>Công thức local vẫn ở trên thiết bị này.</p><Link className="btn" href="/account">Đến tài khoản</Link></section>;
  if (!recipeId) return <section className="panel empty"><h2>Chọn món để chia sẻ</h2><p>Mở sổ món và chọn công thức bạn muốn gửi duyệt.</p><Link className="btn" href="/library">Mở sổ món</Link></section>;
  if (!record) return <p className="loading" role="status">Đang mở công thức trên thiết bị…</p>;

  const recipe = record.recipe;
  const publicDto = {
    title: recipe.name, summary: recipe.summary, servings: recipe.servings,
    minutes: Math.min(recipe.minutes, 240), difficulty: recipe.difficulty,
    ingredients: recipe.ingredients.map(({ name, grams }) => ({ name, ...(grams ? { grams } : {}) })),
    steps: recipe.steps.map(({ text, durationSeconds }) => ({ text, ...(durationSeconds === undefined ? {} : { durationSeconds }) })),
    nutrition: { calories: recipe.nutrition.calories, macros: recipe.nutrition.macros },
    sources: recipe.sources.slice(0, 10).map(({ title, url, note }) => ({ title, url, note })),
    tags: [],
  };

  return <div className="community-share-page">
    <header className="compact-head"><span className="eyebrow">Chia sẻ công thức</span><h1>{recipe.name}</h1><p>Bài gửi sẽ vào hàng chờ duyệt trước khi xuất hiện trong cộng đồng.</p></header>
    <form action={action} className="panel stack-sm">
      <input type="hidden" name="recipe" value={JSON.stringify(publicDto)} />
      <label className="field" htmlFor="share-title">Tên công thức</label>
      <input className="input" id="share-title" name="title" maxLength={150} defaultValue={recipe.name} required />
      <label className="field" htmlFor="share-summary">Mô tả ngắn</label>
      <textarea className="input" id="share-summary" name="summary" maxLength={500} rows={3} defaultValue={recipe.summary.slice(0, 500)} />
      <label className="field" htmlFor="public-display-name">Tên hiển thị công khai</label>
      <input className="input" id="public-display-name" name="display_name" value={displayName} maxLength={40} required onChange={(event) => setDisplayName(event.target.value)} />
      <p className="community-footnote">Sẽ chia sẻ: tên món, nguyên liệu, các bước nấu, ước tính dinh dưỡng và nguồn tham khảo. Hồ sơ khẩu vị, dị ứng và ghi chú cá nhân không được đưa vào bài.</p>
      <label className="check"><input type="checkbox" name="share_publicly" value="yes" required /><span>Tôi có quyền chia sẻ nội dung này và đồng ý để công khai sau khi được duyệt.</span></label>
      <button className="btn full" type="submit" disabled={pending || state.status === 'success'}><Share2 size={18} />{pending ? 'Đang gửi duyệt…' : state.status === 'success' ? 'Đã gửi' : 'Gửi vào hàng chờ duyệt'}</button>
      {state.message && <p className={state.status === 'error' ? 'account-message is-error' : 'account-message'} role={state.status === 'error' ? 'alert' : 'status'}>{state.message}</p>}
    </form>
  </div>;
}
