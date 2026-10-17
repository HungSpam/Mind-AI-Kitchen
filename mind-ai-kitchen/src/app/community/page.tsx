import Link from 'next/link';
import { ArrowRight, Search, UsersRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { featuredRecipes, normalizeCommunitySearch, type FeaturedRecipe } from '@/features/community/featured-recipes';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CommunityPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = typeof params.q === 'string' ? params.q : '';
  const queryText = raw.trim().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').slice(0, 60);
  const normalizedQuery = normalizeCommunitySearch(queryText);
  const supabase = await createClient();
  const { data: session } = supabase ? await supabase.auth.getClaims() : { data: null };
  const metadata = session?.claims?.app_metadata;
  const isModerator = Boolean(metadata && typeof metadata === 'object' && !Array.isArray(metadata) && (metadata as { role?: unknown }).role === 'moderator');
  let posts: { id: string; title: string; summary: string; minutes: number; servings: number; difficulty: string; tags: string[]; author_id: string }[] = [];
  let names = new Map<string, string>();
  let availableSamples: FeaturedRecipe[] = featuredRecipes;
  let failed = false;

  if (supabase) {
    const { data: curated } = await supabase.from('community_featured_recipes')
      .select('id,title,summary,servings,minutes,difficulty,category,emoji,tone,calories,tags,ingredients,steps')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (curated?.length) availableSamples = curated.map((recipe) => ({
      ...recipe,
      difficulty: recipe.difficulty,
      tone: recipe.tone,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients as FeaturedRecipe['ingredients'] : [],
      steps: Array.isArray(recipe.steps) ? recipe.steps as FeaturedRecipe['steps'] : [],
    }));
    let request = supabase.from('community_posts')
      .select('id,title,summary,minutes,servings,difficulty,tags,author_id,published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(30);
    if (normalizedQuery.length >= 2) request = request.ilike('search_text', `%${normalizedQuery}%`);
    const { data, error } = await request;
    failed = Boolean(error);
    posts = data ?? [];
    if (posts.length) {
      const { data: profiles } = await supabase.from('public_profiles').select('user_id,display_name').in('user_id', posts.map((post) => post.author_id));
      names = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.display_name]));
    }
  }

  const samplePosts = availableSamples.filter((recipe) => {
    if (normalizedQuery.length < 2) return true;
    return normalizeCommunitySearch(`${recipe.title} ${recipe.summary} ${recipe.tags.join(' ')} ${recipe.ingredients.map((item) => item.name).join(' ')}`).includes(normalizedQuery);
  });

  return <div className="community-page">
    <header className="compact-head">
      <span className="eyebrow">Bếp của mọi người</span>
      <h1>Cộng đồng</h1>
      <p>Tìm món đã được người nấu chia sẻ. Công thức đang được kiểm duyệt trước khi xuất hiện ở đây.</p>
      {isModerator && <Link className="link" href="/community/moderation">Mở hàng chờ kiểm duyệt</Link>}
      {session?.claims?.sub && <Link className="link" href="/community/my">Bài của tôi</Link>}
    </header>
    <form action="/community" className="community-search" role="search">
      <Search size={20} aria-hidden="true" />
      <label className="sr-only" htmlFor="community-query">Tìm công thức</label>
      <input id="community-query" name="q" defaultValue={queryText} placeholder="Tìm tên món hoặc nguyên liệu" maxLength={60} minLength={2} />
      <button className="btn" type="submit">Tìm</button>
    </form>
    {!supabase && <div className="notice notice-info"><UsersRound size={18} /><p>Đang xem các công thức mẫu do Mind AI Kitchen biên soạn. Đăng nhập để đồng bộ và tham gia chia sẻ công thức.</p></div>}
    {failed && <div className="notice notice-danger" role="status"><p>Chưa tải được công thức. Thử lại sau.</p></div>}
    {!posts.length && !samplePosts.length && <div className="empty"><div className="empty-icon"><UsersRound size={23} /></div><h2>Chưa tìm thấy món phù hợp</h2><p>Thử tên món hoặc nguyên liệu khác.</p></div>}
    {!!posts.length && <section className="community-section" aria-label="Công thức do thành viên chia sẻ"><div className="community-section-head"><h2>Món từ thành viên</h2><span>{posts.length} công thức</span></div><div className="community-grid">
      {posts.map((post) => <Link className="community-card" key={post.id} href={`/community/${post.id}`}>
        <span className="community-card-label">Thành viên chia sẻ</span>
        <div className="community-card-top"><span>{post.difficulty}</span><span>{post.minutes} phút</span></div>
        <h2>{post.title}</h2>
        <p>{post.summary || 'Công thức được chia sẻ từ cộng đồng.'}</p>
        <div className="community-card-bottom"><span>{post.servings} phần · {names.get(post.author_id) || 'Bếp cộng đồng'}</span><ArrowRight size={18} /></div>
        {!!post.tags.length && <div className="chips">{post.tags.slice(0, 3).map((tag) => <span className="badge" key={tag}>{tag}</span>)}</div>}
      </Link>)}
    </div></section>}
    {!!samplePosts.length && <section className="community-section" aria-label="Công thức mẫu do Mind AI Kitchen biên soạn"><div className="community-section-head"><div><h2>Khám phá món ngon</h2><p>Công thức mẫu được đội ngũ biên soạn để bạn trải nghiệm.</p></div><span>{samplePosts.length} món mẫu</span></div><div className="community-grid">
      {samplePosts.map((recipe) => <Link className="community-card community-sample-card" key={recipe.id} href={`/community/${recipe.id}`}>
        <div className={`community-card-visual tone-${recipe.tone}`} aria-hidden="true"><span>{recipe.emoji}</span><small>{recipe.category}</small></div>
        <span className="community-card-label">Món mẫu · Bếp Mind AI</span>
        <div className="community-card-top"><span>{recipe.difficulty}</span><span>{recipe.minutes} phút</span></div>
        <h3>{recipe.title}</h3>
        <p>{recipe.summary}</p>
        <div className="community-card-bottom"><span>{recipe.servings} phần · ~{recipe.calories} kcal/phần</span><ArrowRight size={18} /></div>
        <div className="chips">{recipe.tags.slice(0, 3).map((tag) => <span className="badge" key={tag}>{tag}</span>)}</div>
      </Link>)}
    </div></section>}
    <p className="community-footnote">Bạn có thể lưu món đã duyệt vào sổ công thức. Tính năng chia sẻ đang chờ hoàn tất quy trình kiểm duyệt.</p>
  </div>;
}
