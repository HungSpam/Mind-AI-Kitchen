'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Flag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function ReportPostButton({ postId, signedIn }: { postId: string; signedIn: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function report(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    const form = event.currentTarget;
    const data = new FormData(event.currentTarget);
    const reason = String(data.get('reason') || '');
    const detail = String(data.get('detail') || '').trim().slice(0, 1000);
    try {
      const client = createClient();
      if (!client) throw new Error('Chưa kết nối tài khoản.');
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError || !auth.user) throw new Error('Hãy đăng nhập lại trước khi gửi báo cáo.');
      const { error: reportError } = await client.rpc('submit_content_report', { post_id: postId, reason, detail: detail || null });
      if (reportError) throw new Error('Chưa gửi được báo cáo. Thử lại sau.');
      setMessage('Đã gửi báo cáo riêng cho nhóm kiểm duyệt.');
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa gửi được báo cáo.');
    } finally { setBusy(false); }
  }

  if (!signedIn) return <p className="community-footnote"><Link href="/account">Đăng nhập</Link> để báo cáo nội dung có vấn đề.</p>;
  return <details className="community-report">
    <summary><Flag size={17} /> Báo cáo công thức</summary>
    <form onSubmit={report} className="stack-sm">
      <label className="field" htmlFor={`report-reason-${postId}`}>Lý do</label>
      <select id={`report-reason-${postId}`} name="reason" defaultValue="ingredient_safety" required>
        <option value="ingredient_safety">Nguy cơ dị ứng hoặc an toàn</option>
        <option value="misleading">Thông tin gây hiểu nhầm</option>
        <option value="spam">Spam</option>
        <option value="rights">Quyền sử dụng nội dung</option>
        <option value="other">Khác</option>
      </select>
      <label className="field" htmlFor={`report-detail-${postId}`}>Chi tiết (không bắt buộc)</label>
      <textarea id={`report-detail-${postId}`} name="detail" maxLength={1000} rows={3} />
      <button className="btn btn-secondary" type="submit" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi báo cáo'}</button>
      {message && <p className="account-message" role="status">{message}</p>}
      {error && <p className="account-message is-error" role="alert">{error}</p>}
    </form>
  </details>;
}
