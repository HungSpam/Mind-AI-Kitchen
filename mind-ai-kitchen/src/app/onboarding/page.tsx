'use client';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Save } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { db, saveProfileRevision } from '@/lib/db';
import { profileSchema } from '@/lib/schemas';
import { splitAllergies, normalizeText } from '@/lib/text';
import { Notice } from '@/components/notice';
const quickAllergies = [
  'Hải sản',
  'Cá',
  'Đậu phộng',
  'Đậu nành',
  'Sữa',
  'Trứng',
  'Gluten',
  'Mè',
  'Hạt cây',
];
export default function ProfilePage() {
  const { profile, setProfile } = useAppStore();
  const [draft, setDraft] = useState(profile);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const revisions = useLiveQuery(
    () => db.profileRevisions.orderBy('createdAt').reverse().limit(5).toArray(),
    [],
  );
  function toggle(value: string) {
    const entries = splitAllergies(draft.allergies);
    const exists = entries.some((e) => normalizeText(e) === normalizeText(value));
    setDraft({
      ...draft,
      allergies: (exists
        ? entries.filter((e) => normalizeText(e) !== normalizeText(value))
        : [...entries, value]
      ).join(', '),
    });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const value = profileSchema.parse({ ...draft, updatedAt: Date.now() });
      await saveProfileRevision(value);
      setProfile(value);
      setMessage('Đã lưu hồ sơ. Công thức mở lại sẽ được kiểm tra theo dị ứng mới nhất.');
    } catch {
      setError('Chưa lưu được hồ sơ. Kiểm tra quyền lưu dữ liệu của trình duyệt và thử lại.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="narrow-page">
      <div className="compact-head">
        <h1>Khẩu vị của tôi</h1>
        <p>Lưu thực phẩm cần tránh và cách bạn thích ăn.</p>
      </div>
      <form className="stack" onSubmit={save}>
        <section className="panel stack">
          <h2 style={{ fontSize: 20, marginBottom: 0 }}>Thực phẩm cần tránh</h2>
          <div className="chips">
            {quickAllergies.map((value) => (
              <button
                key={value}
                type="button"
                className="chip"
                aria-pressed={splitAllergies(draft.allergies).some(
                  (entry) => normalizeText(entry) === normalizeText(value),
                )}
                onClick={() => toggle(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <label className="field">
            Dị ứng và thành phần cần loại trừ
            <textarea
              maxLength={500}
              value={draft.allergies}
              onChange={(event) => setDraft({ ...draft, allergies: event.target.value })}
              placeholder="Thêm thực phẩm khác, ngăn cách bằng dấu phẩy"
            />
          </label>
          <p className="small muted" style={{ margin: 0 }}>
            Vẫn cần kiểm tra nhãn gia vị và nguy cơ nhiễm chéo.
          </p>
        </section>
        <section className="panel stack">
          <label className="field">
            Ưu tiên bữa ăn
            <select
              value={draft.goal}
              onChange={(event) => setDraft({ ...draft, goal: event.target.value })}
            >
              <option value="health">Đa dạng và cân bằng</option>
              <option value="fat-loss">Chú ý tổng năng lượng</option>
              <option value="muscle-gain">Ưu tiên giàu đạm</option>
              <option value="quick">Nhanh, ít chuẩn bị</option>
            </select>
          </label>
          <label className="field">
            Thích gì, không thích gì?
            <textarea
              maxLength={500}
              value={draft.preferences}
              onChange={(event) => setDraft({ ...draft, preferences: event.target.value })}
              placeholder="Ví dụ: ít cay, thích món hấp…"
            />
          </label>
        </section>
        {error && <Notice kind="danger">{error}</Notice>}
        {message && <Notice kind="success">{message}</Notice>}
        <button className="btn full" disabled={saving}>
          <Save size={18} />
          {saving ? 'Đang lưu…' : 'Lưu khẩu vị'}
        </button>
      </form>
      <details className="profile-history">
        <summary>Lịch sử thay đổi</summary>
        {!revisions?.length ? (
          <p className="small muted">Chưa có thay đổi.</p>
        ) : (
          revisions.map((revision) => (
            <div key={revision.id} className="meal-row">
              <Check size={16} />
              <div className="meal-info">
                <strong>{new Date(revision.createdAt).toLocaleString('vi-VN')}</strong>
                <small>
                  {revision.profile.allergies || 'Chưa ghi nhận dị ứng'} ·{' '}
                  {revision.profile.preferences || 'Chưa ghi khẩu vị'}
                </small>
              </div>
            </div>
          ))
        )}
      </details>
    </div>
  );
}
