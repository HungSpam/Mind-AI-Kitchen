import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { resubmitCommunityPost, withdrawCommunityPost } from './actions';

export default async function MyCommunityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const supabase = await createClient();
  if (!supabase) return <div className="empty"><h1>Đăng nhập để xem bài của bạn</h1><Link className="btn" href="/account">Đến tài khoản</Link></div>;
  const { data: claims } = await supabase.auth.getClaims();
  const userId = typeof claims?.claims?.sub === 'string' ? claims.claims.sub : null;
  if (!userId) return <div className="empty"><h1>Đăng nhập để xem bài của bạn</h1><Link className="btn" href="/account">Đến tài khoản</Link></div>;
  const { data: posts, error } = await supabase.from('community_posts')
    .select('id,title,summary,status,moderation_reason,created_at,published_at')
    .eq('author_id', userId).order('created_at', { ascending: false }).limit(100);
  const labels: Record<string, string> = { draft: 'Bản nháp', pending: 'Đang chờ duyệt', published: 'Đang công khai', rejected: 'Cần chỉnh sửa', hidden: 'Đang ẩn', withdrawn: 'Đã gỡ' };

  return <div className="community-moderation">
    <Link className="community-back" href="/community"><ArrowLeft size={18} /> Cộng đồng</Link>
    <header className="compact-head"><span className="eyebrow">Công thức bạn chia sẻ</span><h1>Bài của tôi</h1><p>Xem trạng thái duyệt hoặc gỡ bài đã công khai.</p></header>
    {params.updated === '1' && <p className="account-message" role="status">Đã cập nhật trạng thái bài viết.</p>}
    {params.error === 'action' && <p className="account-message is-error" role="alert">Thao tác chưa thành công. Hãy tải lại rồi thử lại.</p>}
    {error && <p className="account-message is-error" role="alert">Chưa tải được bài viết.</p>}
    {!error && !posts?.length && <div className="panel empty"><div className="empty-icon"><BookOpen size={22} /></div><h2>Chưa có bài chia sẻ</h2><p>Chọn một món trong sổ công thức để gửi duyệt.</p><Link className="btn" href="/library">Mở sổ công thức</Link></div>}
    {posts?.map((post) => <article className="panel moderation-card" key={post.id}>
      <span className="badge">{labels[post.status] || 'Đang xem xét'}</span>
      <h2>{post.title}</h2><p>{post.summary}</p>
      {post.moderation_reason && <p className="notice notice-info">Ghi chú kiểm duyệt: {post.moderation_reason}</p>}
      {post.status === 'draft' && <form action={resubmitCommunityPost}><input type="hidden" name="post_id" value={post.id} /><button className="btn">Gửi duyệt</button></form>}
      {post.status === 'published' && <form action={withdrawCommunityPost}><input type="hidden" name="post_id" value={post.id} /><button className="btn btn-secondary">Gỡ khỏi cộng đồng</button></form>}
    </article>)}
  </div>;
}
