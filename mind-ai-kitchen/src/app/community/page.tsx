import Link from 'next/link';
import { ArrowRight, Search, UsersRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CommunityPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = typeof params.q === 'string' ? params.q : '';
  const queryText = raw.trim().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').slice(0, 60);
  const normalizedQuery = queryText.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd');
  const supabase = await createClient();
  const { data: session } = supabase ? await supabase.auth.getClaims() : { data: null };
  const metadata = session?.claims?.app_metadata;
  const isModerator = Boolean(metadata && typeof metadata === 'object' && !Array.isArray(metadata) && (metadata as { role?: unknown }).role === 'moderator');
  let posts: { id: string; title: string; summary: string; minutes: number; servings: number; difficulty: string; tags: string[]; author_id: string }[] = [];
  let names = new Map<string, string>();
  let failed = false;

  if (supabase) {
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
    {!supabase && <div className="notice notice-info"><UsersRound size={18} /><p>Cộng đồng sẽ mở khi dự án kết nối Supabase. Các món riêng tư trên thiết bị vẫn ở nguyên đó.</p></div>}
    {failed && <div className="notice notice-danger" role="status"><p>Chưa tải được công thức. Thử lại sau.</p></div>}
    {supabase && !failed && posts.length === 0 && <div className="empty"><div className="empty-icon"><UsersRound size={23} /></div><h2>{queryText ? 'Chưa tìm thấy món phù hợp' : 'Bếp cộng đồng đang được chuẩn bị'}</h2><p>{queryText ? 'Thử tên món hoặc nguyên liệu khác.' : 'Công thức sẽ xuất hiện sau khi tác giả gửi và hoàn tất bước duyệt.'}</p></div>}
    {!!posts.length && <section className="community-grid" aria-label="Công thức cộng đồng">
      {posts.map((post) => <Link className="community-card" key={post.id} href={`/community/${post.id}`}>
        <div className="community-card-top"><span>{post.difficulty}</span><span>{post.minutes} phút</span></div>
        <h2>{post.title}</h2>
        <p>{post.summary || 'Công thức được chia sẻ từ cộng đồng.'}</p>
        <div className="community-card-bottom"><span>{post.servings} phần · {names.get(post.author_id) || 'Bếp cộng đồng'}</span><ArrowRight size={18} /></div>
        {!!post.tags.length && <div className="chips">{post.tags.slice(0, 3).map((tag) => <span className="badge" key={tag}>{tag}</span>)}</div>}
      </Link>)}
    </section>}
    <p className="community-footnote">Bạn có thể lưu món đã duyệt vào sổ công thức. Tính năng chia sẻ đang chờ hoàn tất quy trình kiểm duyệt.</p>
  </div>;
}
