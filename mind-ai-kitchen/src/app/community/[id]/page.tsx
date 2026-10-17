import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock3, UsersRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { supabaseEnvironment } from '@/lib/supabase/env';
import type { Json } from '@/lib/supabase/database';
import { CommunitySaveButton } from '@/features/community/save-button';
import { ReportPostButton } from '@/features/community/report-button';

function record(value: Json): Record<string, Json | undefined> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

export default async function CommunityRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) notFound();
  const supabase = await createClient();
  if (!supabase || !supabaseEnvironment()) return <div className="empty"><h1>Cộng đồng chưa kết nối</h1><p>Công thức sẽ hiển thị khi Supabase được cấu hình.</p><Link className="btn" href="/community">Quay lại cộng đồng</Link></div>;
  const { data: post } = await supabase.from('community_posts')
    .select('id,title,summary,servings,minutes,difficulty,ingredients,steps,nutrition,sources,tags,author_id,published_at')
    .eq('id', id).eq('status', 'published').maybeSingle();
  if (!post) notFound();
  const { data: profile } = await supabase.from('public_profiles').select('display_name').eq('user_id', post.author_id).maybeSingle();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = typeof auth?.claims?.sub === 'string' ? auth.claims.sub : null;
  const { data: existingSave } = userId
    ? await supabase.from('community_saves').select('post_id,saved_recipe_id').eq('post_id', post.id).maybeSingle()
    : { data: null };
  const ingredients = Array.isArray(post.ingredients) ? post.ingredients.map(record).filter((item): item is NonNullable<typeof item> => Boolean(item)).filter((item) => typeof item.name === 'string').slice(0, 100) : [];
  const steps = Array.isArray(post.steps) ? post.steps.map((item) => typeof item === 'string' ? item : record(item)?.text).filter((item): item is string => typeof item === 'string').slice(0, 60) : [];
  const sources = Array.isArray(post.sources) ? post.sources.map(record).filter((item): item is NonNullable<typeof item> => Boolean(item)).filter((item) => typeof item.title === 'string' && typeof item.url === 'string' && (() => { try { return new URL(item.url as string).protocol === 'https:'; } catch { return false; } })()).slice(0, 10) : [];

  return <article className="community-recipe">
    <Link className="community-back" href="/community"><ArrowLeft size={18} /> Cộng đồng</Link>
    <header className="compact-head"><span className="eyebrow">Chia sẻ bởi {profile?.display_name || 'Bếp cộng đồng'}</span><h1>{post.title}</h1><p>{post.summary}</p>
      <div className="recipe-meta"><span><Clock3 size={17} />{post.minutes} phút</span><span><UsersRound size={17} />{post.servings} phần</span><span>{post.difficulty}</span></div>
    </header>
    <section className="panel"><h2>Nguyên liệu</h2>{ingredients.length ? <ul className="community-ingredients">{ingredients.map((item, index) => <li key={index}><span>{String(item.name)}</span>{typeof item.amount === 'string' || typeof item.amount === 'number' ? <strong>{item.amount}{typeof item.unit === 'string' ? ` ${item.unit}` : ''}</strong> : typeof item.grams === 'number' ? <strong>{item.grams} g</strong> : null}</li>)}</ul> : <p>Nguyên liệu chưa được định dạng để hiển thị.</p>}</section>
    <section className="panel"><h2>Cách làm</h2>{steps.length ? <ol className="community-steps">{steps.map((step, index) => <li key={index}><span>{index + 1}</span><p>{step.slice(0, 2000)}</p></li>)}</ol> : <p>Các bước nấu chưa được định dạng để hiển thị.</p>}</section>
    {!!sources.length && <section className="panel"><h2>Nguồn tham khảo</h2><ul className="community-sources">{sources.map((source, index) => <li key={index}><a href={String(source.url)} target="_blank" rel="noopener noreferrer">{String(source.title)}</a>{typeof source.note === 'string' && <p>{source.note}</p>}</li>)}</ul></section>}
    <CommunitySaveButton postId={post.id} signedIn={Boolean(userId)} initialSaved={Boolean(existingSave)} savedRecipeId={existingSave?.saved_recipe_id ?? null} />
    <ReportPostButton postId={post.id} signedIn={Boolean(userId)} />
    <p className="community-footnote">Công thức do thành viên chia sẻ. Hãy tự kiểm tra dị ứng và độ chín an toàn của thực phẩm.</p>
  </article>;
}
