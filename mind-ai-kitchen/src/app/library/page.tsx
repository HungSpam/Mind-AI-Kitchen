'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowUpRight, BookOpen, Download, Upload, Heart, Search, Plus, Trash2 } from 'lucide-react';
import { db } from '@/lib/db';
import { exportBackup, importBackup } from '@/lib/backup';
import { useAppStore } from '@/store/useAppStore';
import { normalizeText } from '@/lib/text';
import { reviewRecipe } from '@/lib/recipe-review';
import { Notice } from '@/components/notice';
import { ConfirmModal } from '@/components/confirm-modal';
import type { RecipeResult } from '@/types/domain';

export default function LibraryPage() {
  const records = useLiveQuery(() => db.recipes.orderBy('createdAt').reverse().toArray(), []);
  const archivedCount = useLiveQuery(() => db.legacyArchive.count(), []);
  const { profile, setCurrentRecipe } = useAppStore();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<{ id: string; title: string } | null>(null);

  const valid = records?.filter((r) => r.recipe?.id && r.recipe?.nutrition);
  const filtered = valid?.filter(
    (r) => (!favorites || r.isFavorite) && normalizeText(r.title).includes(normalizeText(query)),
  );
  function open(recipe: RecipeResult) {
    setCurrentRecipe(reviewRecipe(recipe, profile));
    router.push('/result');
  }
  async function handleDeleteRecipe() {
    if (!recipeToDelete) return;
    try {
      await db.recipes.delete(recipeToDelete.id);
      setMessage(`Đã xóa món "${recipeToDelete.title}" khỏi sổ công thức.`);
      setError('');
    } catch {
      setError('Không thể xóa món này. Vui lòng thử lại.');
    } finally {
      setRecipeToDelete(null);
    }
  }
  async function backup() {
    setError('');
    setBusy(true);
    try {
      const data = await exportBackup(profile);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mind-kitchen-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        'Đã tạo bản sao lưu. Tệp có hồ sơ ăn uống riêng tư của bạn; hãy cất giữ cẩn thận.',
      );
    } catch {
      setError('Không xuất được dữ liệu. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }
  async function restore(file?: File) {
    if (!file) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (file.size > 10_000_000) throw new Error('Tệp phải nhỏ hơn 10 MB.');
      const count = await importBackup(await file.text(), profile);
      setMessage(
        'Đã nhập ' +
          count +
          ' công thức mới. Giữ nguyên hồ sơ và phản hồi hiện tại; hồ sơ trong bản sao lưu được thêm vào lịch sử.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không nhập được dữ liệu.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="page-head page-actions">
        <div>
          <p className="eyebrow">Giữ lại những món ngon</p>
          <h1>Sổ công thức</h1>
          <p>Mở lại, nấu lại, thêm ghi chú. Khẩu vị của bạn được ghi nhớ qua từng lần phản hồi.</p>
        </div>
        <Link className="btn" href="/scan">
          <Plus size={17} />
          Món mới
        </Link>
      </div>
      <div className="toolbar">
        <Search size={19} />
        <label className="sr-only" htmlFor="recipe-search">
          Tìm công thức
        </label>
        <input
          id="recipe-search"
          className="input"
          placeholder="Tìm tên món ăn…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="chip" aria-pressed={favorites} onClick={() => setFavorites(!favorites)}>
          Yêu thích
        </button>
        <button className="btn btn-secondary" onClick={backup} disabled={busy}>
          <Download size={16} />
          Sao lưu
        </button>
        <label className="btn btn-secondary" style={{ position: 'relative', cursor: 'pointer' }}>
          <Upload size={16} />
          Nhập sao lưu
          <input
            type="file"
            aria-label="Nhập bản sao lưu"
            accept="application/json,.json"
            disabled={busy}
            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer' }}
            onChange={(e) => {
              void restore(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <p className="small muted">
        Lưu trên trình duyệt này. Sao lưu để chuyển sang thiết bị khác hoặc trước khi xóa dữ liệu
        trình duyệt.
      </p>
      {!!archivedCount && (
        <Notice kind="info">
          Đã giữ {archivedCount} bản ghi cũ trong kho lưu trữ. Chúng được kèm trong tệp sao lưu,
          nhưng cần tạo lại công thức trước khi nấu.
        </Notice>
      )}
      {error && <Notice kind="danger">{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}
      {!!records && records.length > (valid?.length || 0) && (
        <Notice kind="warning">
          Có dữ liệu công thức từ phiên bản cũ. Dữ liệu vẫn được giữ trong bản sao lưu; hãy tạo lại
          công thức để sử dụng bộ kiểm tra mới.
        </Notice>
      )}
      {!filtered ? (
        <div className="loading">Đang mở sổ công thức…</div>
      ) : !filtered.length ? (
        <div className="panel empty" style={{ marginTop: 24 }}>
          <div className="empty-icon">
            <BookOpen size={24} />
          </div>
          <h3>{query || favorites ? 'Chưa tìm thấy món phù hợp' : 'Những món muốn nấu lại'}</h3>
          <p>
            {query || favorites
              ? 'Thử đổi từ khóa hoặc bỏ bộ lọc yêu thích.'
              : 'Công thức mới sẽ tự động được lưu ở đây. Bắt đầu với những gì đang có trong bếp nhé.'}
          </p>
          <Link className="btn" href="/scan">
            Tạo món đầu tiên <ArrowUpRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="grid-three" style={{ marginTop: 24 }}>
          {filtered.map((record, index) => (
            <article className="recipe-card" key={record.id}>
              <div className="row between">
                <span className="recipe-index">{String(index + 1).padStart(2, '0')}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    aria-label={(record.isFavorite ? 'Bỏ yêu thích ' : 'Yêu thích ') + record.title}
                    aria-pressed={record.isFavorite}
                    className="icon-btn"
                    onClick={async () => {
                      try {
                        await db.recipes.update(record.id, { isFavorite: !record.isFavorite });
                      } catch {
                        setError('Chưa lưu được yêu thích.');
                      }
                    }}
                  >
                    <Heart size={17} fill={record.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    aria-label={'Xóa món ' + record.title}
                    className="icon-btn icon-btn-delete"
                    title="Xóa món"
                    onClick={() => setRecipeToDelete({ id: record.id, title: record.title })}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
              <h2>{record.title}</h2>
              <p className="muted">
                {record.recipe.minutes} phút · {record.recipe.servings} phần ·{' '}
                {record.recipe.ingredients.length} nguyên liệu
              </p>
              {record.notes && <p>{record.notes}</p>}
              <div className="card-bottom">
                <span className="small muted">
                  {record.rating
                    ? record.rating + '/5 · đánh giá của bạn'
                    : new Date(record.createdAt).toLocaleDateString('vi-VN')}
                </span>
                <button className="btn btn-tertiary" onClick={() => open(record.recipe)}>
                  Mở món <ArrowUpRight size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <ConfirmModal
        isOpen={!!recipeToDelete}
        title="Xóa công thức"
        message={
          <p style={{ margin: 0 }}>
            Bạn có chắc chắn muốn xóa món <strong>{recipeToDelete?.title}</strong> khỏi sổ công thức?
            Hành động này không thể hoàn tác.
          </p>
        }
        confirmLabel="Xóa món"
        cancelLabel="Giữ lại"
        onConfirm={handleDeleteRecipe}
        onCancel={() => setRecipeToDelete(null)}
      />
    </div>
  );
}
