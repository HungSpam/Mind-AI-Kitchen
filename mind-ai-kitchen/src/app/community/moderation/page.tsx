import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { hideReportedPost, reviewCommunityPost, resolveCommunityReport } from './actions';

function hasModeratorRole(claims: Record<string, unknown> | undefined) {
  const metadata = claims?.app_metadata;
  return Boolean(metadata && typeof metadata === 'object' && !Array.isArray(metadata) && (metadata as { role?: unknown }).role === 'moderator');
}

export default async function ModerationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getClaims() : { data: null };
  if (!supabase || !hasModeratorRole(data?.claims)) return <div className="empty"><div className="empty-icon"><ShieldCheck size={22} /></div><h1>Không có quyền truy cập</h1><p>Trang này chỉ dành cho nhóm kiểm duyệt được ủy quyền.</p><Link className="btn" href="/community">Quay lại cộng đồng</Link></div>;

  const [{ data: posts }, { data: reports }] = await Promise.all([
    supabase.from('community_posts').select('id,title,summary,servings,minutes,difficulty,ingredients,steps,created_at').eq('status', 'pending').order('created_at', { ascending: true }).limit(100),
    supabase.from('content_reports').select('id,post_id,reason,detail,created_at').eq('status', 'open').order('created_at', { ascending: true }).limit(100),
  ]);
  const reportedIds = [...new Set((reports ?? []).map((report) => report.post_id))];
  const reportedPosts = reportedIds.length ? await supabase.from('community_posts').select('id,title,status').in('id', reportedIds) : { data: [] };
  const reportedMap = new Map((reportedPosts.data ?? []).map((post) => [post.id, { title: post.title, status: post.status }]));

  return <div className="community-moderation">
    <Link className="community-back" href="/community"><ArrowLeft size={18} /> Cộng đồng</Link>
    <header className="compact-head"><span className="eyebrow">Quyền moderator</span><h1>Kiểm duyệt</h1><p>Công thức chỉ được công khai sau khi được duyệt. Mỗi quyết định được ghi vào nhật ký.</p></header>
    {params.updated === '1' && <p className="account-message" role="status">Đã cập nhật trạng thái kiểm duyệt.</p>}
    {params.error === 'action' && <p className="account-message is-error" role="alert">Thao tác chưa thành công. Hãy tải lại và thử lại.</p>}
    <section className="stack">
      <h2>Chờ duyệt ({posts?.length ?? 0})</h2>
      {!posts?.length && <p className="muted">Không có công thức đang chờ.</p>}
      {posts?.map((post) => <article className="panel moderation-card" key={post.id}>
        <span className="badge">{post.difficulty} · {post.minutes} phút · {post.servings} phần</span>
        <h3>{post.title}</h3><p>{post.summary}</p>
        <details><summary>Xem nội dung công thức</summary><pre>{JSON.stringify({ ingredients: post.ingredients, steps: post.steps }, null, 2)}</pre></details>
        <form action={reviewCommunityPost} className="moderation-actions">
          <input type="hidden" name="post_id" value={post.id} />
          <label className="field">Lý do quyết định<input name="reason" className="input" minLength={3} maxLength={1000} defaultValue="Đã kiểm tra nội dung và an toàn công thức." required /></label>
          <button className="btn" name="decision" value="approve">Duyệt công thức</button>
          <button className="btn btn-secondary" name="decision" value="reject">Từ chối</button>
        </form>
      </article>)}
    </section>
    <section className="stack">
      <h2>Báo cáo đang mở ({reports?.length ?? 0})</h2>
      {!reports?.length && <p className="muted">Không có báo cáo đang chờ.</p>}
      {reports?.map((report) => <article className="panel moderation-card" key={report.id}>
        <span className="badge badge-warm">{report.reason.replaceAll('_', ' ')}</span>
        <h3>{reportedMap.get(report.post_id)?.title || 'Công thức đã bị gỡ'}</h3>
        <p>{report.detail || 'Không có chi tiết bổ sung.'}</p>
        {reportedMap.get(report.post_id)?.status === 'published' && <><div className="row wrap"><Link className="link" href={`/community/${report.post_id}`}>Mở công thức</Link></div><form action={hideReportedPost} className="moderation-actions"><input type="hidden" name="post_id" value={report.post_id} /><label className="field">Lý do ẩn bài<input className="input" name="reason" minLength={3} maxLength={1000} defaultValue="Ẩn trong khi xử lý báo cáo an toàn." required /></label><button className="btn btn-danger">Ẩn công thức</button></form></>}
        <form action={resolveCommunityReport} className="moderation-actions">
          <input type="hidden" name="report_id" value={report.id} />
          <label className="field">Ghi chú xử lý<input name="resolution" className="input" minLength={3} maxLength={1000} defaultValue="Đã xem xét báo cáo." required /></label>
          <button className="btn" name="decision" value="resolved">Đánh dấu đã xử lý</button>
          <button className="btn btn-secondary" name="decision" value="dismissed">Bỏ qua báo cáo</button>
        </form>
      </article>)}
    </section>
  </div>;
}
