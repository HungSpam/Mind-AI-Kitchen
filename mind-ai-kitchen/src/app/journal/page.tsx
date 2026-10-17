'use client';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getTodayCalories } from '@/lib/db';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { Notice } from '@/components/notice';
import { ConfirmModal } from '@/components/confirm-modal';
import { SwipeableMealRow } from '@/components/swipeable-meal-row';

export default function JournalPage() {
  const today = useLiveQuery(getTodayCalories, []);
  const meals = useLiveQuery(() => db.mealLogs.orderBy('consumedAt').reverse().toArray(), []);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [mealToDelete, setMealToDelete] = useState<{ id: string; name: string } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleDeleteMeal() {
    if (!mealToDelete) return;
    try {
      await db.mealLogs.delete(mealToDelete.id);
      setMessage(`Đã xóa nhật ký bữa ăn "${mealToDelete.name}".`);
      setError('');
    } catch {
      setError('Không thể xóa nhật ký bữa ăn. Vui lòng thử lại.');
    } finally {
      setMealToDelete(null);
      setOpenSwipeId(null);
    }
  }

  return (
    <div className="narrow-page">
      <div className="compact-head">
        <h1>Nhật ký bữa ăn</h1>
        <p>
          {today?.mealCount ?? '—'} bữa hôm nay · {today?.totalCalories ?? '—'} kcal
          {today?.incomplete ? ' tạm tính' : ''}
        </p>
      </div>

      {today?.incomplete && <p className="small muted">Có bữa chưa đủ dữ liệu dinh dưỡng.</p>}
      {error && <Notice kind="danger">{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}

      {!meals ? (
        <p role="status">Đang mở nhật ký…</p>
      ) : !meals.length ? (
        <div className="panel empty" style={{ marginTop: 20 }}>
          <CalendarDays size={32} style={{ margin: '0 auto 16px' }} />
          <h2>Chưa có bữa ăn</h2>
          <p>Hoàn thành món để ghi lại phần bạn đã ăn.</p>
          <Link className="btn" href="/scan">
            Chuẩn bị món mới
          </Link>
        </div>
      ) : (
        <>
          <p className="small muted" style={{ margin: '14px 0 8px', fontStyle: 'italic' }}>
            Mẹo: Vuốt hoặc kéo sang trái trên bữa ăn để hiển thị nút xóa.
          </p>
          <section className="journal-card" style={{ marginTop: 20 }}>
            {meals.map((meal) => (
              <SwipeableMealRow
                key={meal.id}
                id={meal.id}
                recipeName={meal.recipeName}
                mealType={meal.mealType}
                dateStr={new Date(meal.consumedAt).toLocaleDateString('vi-VN')}
                servings={meal.servings}
                calories={meal.calories}
                isOpen={openSwipeId === meal.id}
                onOpen={(id) => setOpenSwipeId(id)}
                onClose={() => setOpenSwipeId(null)}
                onDelete={() => setMealToDelete({ id: meal.id, name: meal.recipeName })}
              />
            ))}
          </section>
        </>
      )}

      <ConfirmModal
        isOpen={!!mealToDelete}
        title="Xóa nhật ký bữa ăn"
        message={
          <p style={{ margin: 0 }}>
            Bạn có chắc chắn muốn xóa nhật ký bữa ăn <strong>{mealToDelete?.name}</strong>? Dữ liệu
            dinh dưỡng và calo hôm nay sẽ được tự động tính toán lại.
          </p>
        }
        confirmLabel="Xóa nhật ký"
        cancelLabel="Giữ lại"
        onConfirm={handleDeleteMeal}
        onCancel={() => {
          setMealToDelete(null);
          setOpenSwipeId(null);
        }}
      />
    </div>
  );
}
