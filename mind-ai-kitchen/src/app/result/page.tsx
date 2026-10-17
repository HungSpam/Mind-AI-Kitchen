'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Users,
  CheckCircle2,
  Circle,
  Save,
  Star,
  Flame,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { SavedRecipeRecord } from '@/types/domain';
import { reviewRecipe } from '@/lib/recipe-review';
import { ALLERGEN_NOTICE } from '@/lib/allergenSynonyms';
import { db, saveRecipeToDB } from '@/lib/db';
import { Notice } from '@/components/notice';

function Feedback({ record }: { record: SavedRecipeRecord }) {
  const [rating, setRating] = useState(record.rating || 0);
  const [notes, setNotes] = useState(record.notes || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await db.recipes.update(record.id, {
        rating: rating || undefined,
        notes: notes.trim(),
        updatedAt: Date.now(),
      });
      setMessage('Đã lưu. Phản hồi này sẽ được dùng khi gợi ý món tiếp theo.');
    } catch {
      setError('Chưa lưu được phản hồi. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Ghi chú của riêng bạn</p>
        <h2>Lần sau, mình sẽ…</h2>
      </div>
      <div className="rating" role="group" aria-label="Đánh giá công thức">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            aria-label={n + ' sao'}
            aria-pressed={rating === n}
            className={rating >= n ? 'selected' : ''}
            onClick={() => setRating(n)}
          >
            <Star
              size={17}
              style={{ margin: 'auto' }}
              fill={rating >= n ? 'currentColor' : 'none'}
            />
          </button>
        ))}
      </div>
      <label className="field">
        Ghi chú khẩu vị
        <textarea
          maxLength={500}
          placeholder="Ví dụ: lần sau bớt cay, thêm rau, nấu mềm hơn…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <button className="btn btn-secondary" onClick={save} disabled={saving}>
        Lưu phản hồi
      </button>
      {message && <Notice kind="success">{message}</Notice>}
      {error && <Notice kind="danger">{error}</Notice>}
    </section>
  );
}
export default function ResultPage() {
  const { currentRecipe, profile, setScannedIngredients } = useAppStore();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const record = useLiveQuery(
    () => (currentRecipe ? db.recipes.get(currentRecipe.id) : undefined),
    [currentRecipe?.id],
  );
  if (!currentRecipe)
    return (
      <div className="empty panel">
        <h1>Chưa có công thức nào đang mở.</h1>
        <p>Chọn món trong sổ hoặc tạo một món mới từ nguyên liệu sẵn có.</p>
        <Link className="btn" href="/scan">
          Chuẩn bị nguyên liệu <ArrowRight size={17} />
        </Link>
      </div>
    );
  const recipe = reviewRecipe(currentRecipe, profile);
  const canCook = !recipe.audit.hasRisk && recipe.ingredients.every((i) => i.confirmed);
  async function save() {
    try {
      await saveRecipeToDB(recipe);
      setSaved(true);
      setError('');
    } catch {
      setError('Chưa lưu được công thức. Kiểm tra quyền lưu dữ liệu của trình duyệt.');
    }
  }
  return (
    <div>
      <Link href="/library" className="btn btn-tertiary">
        <ArrowLeft size={16} />
        Sổ công thức
      </Link>
      <div className="page-head recipe-title" style={{ marginTop: 20 }}>
        <p className="eyebrow">02 · Công thức của bạn</p>
        <h1>{recipe.name}</h1>
        <p>{recipe.summary}</p>
        <div className="recipe-meta">
          <span>
            <Clock size={16} />
            {recipe.minutes} phút
          </span>
          <span>
            <Users size={16} />
            {recipe.servings} phần ăn
          </span>
          <span>{recipe.difficulty}</span>
          {recipe.nutrition.complete && recipe.nutrition.calories ? (
            <span style={{ color: '#e11d48', fontWeight: 600 }}>
              <Flame size={16} />
              {Math.round(recipe.nutrition.calories / recipe.servings)} kcal / phần
            </span>
          ) : (
            <span
              style={{ color: 'var(--muted)' }}
              title="Chưa có khối lượng thực tế để tính calo chuẩn"
            >
              <Flame size={16} />
              Chưa cân gram
            </span>
          )}
          <span>{record || saved ? 'Đã lưu trong sổ' : 'Chưa lưu vào sổ'}</span>
        </div>
        <div className="row wrap">
          {canCook ? (
            <Link href="/cooking" className="btn">
              Vào bếp, từng bước một <ArrowRight size={17} />
            </Link>
          ) : (
            <button className="btn" disabled>
              Cần xử lý dị ứng trước khi nấu
            </button>
          )}
          <Link
            href="/scan"
            className="btn btn-secondary"
            onClick={() => setScannedIngredients(recipe.ingredients)}
          >
            Điều chỉnh & tạo lại
          </Link>
          {!record && !saved && (
            <button className="btn btn-secondary" onClick={save}>
              <Save size={16} />
              Lưu công thức
            </button>
          )}
        </div>
      </div>
      {error && <Notice kind="danger">{error}</Notice>}
      {recipe.audit.hasRisk && (
        <Notice kind="danger">
          <strong>Công thức xung đột với hồ sơ hiện tại.</strong>
          <ul>
            {recipe.audit.flags.map((f, i) => (
              <li key={i}>
                {f.group}: {f.ingredient}
              </li>
            ))}
          </ul>
          Hãy điều chỉnh nguyên liệu và tạo lại toàn bộ công thức. Các bước cũ chưa phù hợp để tiếp
          tục nấu.
        </Notice>
      )}
      <div className="recipe-layout" style={{ marginTop: 28 }}>
        <div className="stack">
          <section className="panel">
            <div className="panel-header">
              <h2>Chuẩn bị</h2>
              <span className="badge">{recipe.servings} phần</span>
            </div>
            <ul className="ingredient-list">
              {recipe.ingredients.map((i) => (
                <li key={i.id}>
                  <span>{i.name}</span>
                  <span>{i.grams ? i.grams + ' g' : 'Chưa cân'}</span>
                </li>
              ))}
            </ul>
            {recipe.nutrition.complete && recipe.nutrition.macros ? (
              <div
                style={{
                  marginTop: 18,
                  padding: '12px 16px',
                  background: 'var(--card-subtle, rgba(0,0,0,0.03))',
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <strong
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                      color: '#e11d48',
                    }}
                  >
                    <Flame size={16} />
                    Dinh dưỡng: {Math.round(recipe.nutrition.calories! / recipe.servings)} kcal /
                    phần
                  </strong>
                  <span className="small muted">Đối chiếu chuẩn USDA</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    fontSize: 13,
                    color: 'var(--muted)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ borderLeft: '3px solid #e11d48', paddingLeft: 8 }}>
                    Đạm:{' '}
                    <strong style={{ color: 'var(--text)' }}>
                      {Math.round((recipe.nutrition.macros.protein / recipe.servings) * 10) / 10}g
                    </strong>
                  </span>
                  <span style={{ borderLeft: '3px solid #d97706', paddingLeft: 8 }}>
                    Tinh bột:{' '}
                    <strong style={{ color: 'var(--text)' }}>
                      {Math.round((recipe.nutrition.macros.carbs / recipe.servings) * 10) / 10}g
                    </strong>
                  </span>
                  <span style={{ borderLeft: '3px solid #059669', paddingLeft: 8 }}>
                    Chất béo:{' '}
                    <strong style={{ color: 'var(--text)' }}>
                      {Math.round((recipe.nutrition.macros.fat / recipe.servings) * 10) / 10}g
                    </strong>
                  </span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 18,
                  padding: '14px 16px',
                  background: 'var(--card-subtle, rgba(0,0,0,0.02))',
                  borderRadius: 10,
                  border: '1px dashed var(--line)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Flame size={20} color="var(--muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>
                      Ước tính Calo & Dinh dưỡng: Chưa có số liệu
                    </strong>
                    <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
                      Các nguyên liệu hiện <strong>Chưa cân</strong>. Để bảo đảm an toàn cho sức
                      khỏe, Mind AI Kitchen tuân thủ chuẩn USDA và không để AI tự bịa số calo ảo.
                    </p>
                    <Link
                      href="/scan"
                      className="link small"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 8,
                        fontWeight: 600,
                        color: 'var(--accent, #10b981)',
                      }}
                      onClick={() => setScannedIngredients(recipe.ingredients)}
                    >
                      Bấm vào đây để nhập số gram cho từng món và xem Calo →
                    </Link>
                  </div>
                </div>
              </div>
            )}
            <p className="small muted" style={{ marginTop: 14, marginBottom: 0 }}>
              Định lượng cho toàn bộ món. Nước sạch có thể dùng thêm; dầu và gia vị cần có trong
              danh sách.
            </p>
          </section>
          <section className="panel">
            <h2>Cách làm</h2>
            <ol className="recipe-steps">
              {recipe.steps.map((s, i) => (
                <li key={s.id}>
                  <span className="step-label">{i + 1}</span>
                  <div>
                    <p>{s.text}</p>
                    {!!s.durationSeconds && (
                      <small className="muted">
                        Hẹn giờ: {Math.ceil(s.durationSeconds / 60)} phút
                      </small>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
          {record && <Feedback key={record.id} record={record} />}
        </div>
        <aside className="stack">
          <section className="panel">
            <p className="eyebrow">Biết rõ những gì mình ăn</p>
            <h2>Dinh dưỡng tham khảo</h2>
            {recipe.nutrition.complete && recipe.nutrition.macros ? (
              <>
                <div className="metric-value">
                  {Math.round(recipe.nutrition.calories! / recipe.servings)}
                  <span>kcal / phần</span>
                </div>
                <div className="nutrition-grid">
                  {(
                    [
                      ['Đạm', recipe.nutrition.macros.protein, 'protein', '#e11d48'],
                      ['Tinh bột', recipe.nutrition.macros.carbs, 'carbs', '#d97706'],
                      ['Chất béo', recipe.nutrition.macros.fat, 'fat', '#059669'],
                    ] as const
                  ).map(([label, value, key, color]) => (
                    <div
                      className={`nutrition-cell nutrition-cell-${key}`}
                      key={label}
                      style={{ borderLeftColor: color }}
                    >
                      <strong>
                        {Math.round((value / recipe.servings) * 10) / 10}
                        <small style={{ display: 'inline' }}> g</small>
                      </strong>
                      <small>{label}</small>
                    </div>
                  ))}
                </div>
                <p className="small muted">
                  {recipe.nutrition.calories} kcal cho toàn món. Ước tính từ khối lượng và bản ghi
                  thực phẩm; cách chế biến có thể làm thay đổi giá trị.
                </p>
              </>
            ) : (
              <>
                <p className="muted small">
                  Chưa đủ dữ liệu để tính tổng calories và macros. Không sử dụng số ước đoán của AI.
                </p>
                <Notice kind="info">
                  {recipe.nutrition.matched}/{recipe.nutrition.total} nguyên liệu đối chiếu được.
                  Còn thiếu khối lượng hoặc bản ghi phù hợp: {recipe.nutrition.missing.join(', ')}.
                </Notice>
              </>
            )}
            <hr className="divider" />
            <ul className="source-list">
              {recipe.nutrition.items.map((i, index) => (
                <li key={index}>
                  <a href={i.source.url} target="_blank" rel="noopener noreferrer">
                    {i.name} · {i.grams} g → {i.calories} kcal ↗
                  </a>
                  <p>
                    {i.source.title} · {i.source.note}
                  </p>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h3>Những gì đã được kiểm tra</h3>
            {recipe.checks.map((check) => (
              <div className="review-check" key={check.label}>
                {check.passed ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                <div>
                  <strong>{check.label}</strong>
                  <p>{check.detail}</p>
                </div>
              </div>
            ))}
            <hr className="divider" />
            <p className="small muted">{ALLERGEN_NOTICE}</p>
          </section>
          <section className="panel">
            <h3>Nguồn để bạn kiểm tra</h3>
            <ul className="source-list">
              {recipe.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.title} ↗
                  </a>
                  <p>{source.note}</p>
                </li>
              ))}
            </ul>
            <p className="small muted" style={{ marginTop: 16, marginBottom: 0 }}>
              Công thức do {recipe.model} tạo. Các nguồn trên cung cấp dữ liệu và hướng dẫn chung,
              không chứng nhận riêng công thức này.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
