'use client';
import Link from 'next/link';
import { Camera, ArrowRight, ChefHat, CalendarDays, Flame } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import { useCamera } from '@/features/camera/camera-provider';

export default function Home() {
  const { openCamera } = useCamera();
  const currentRecipe = useAppStore((state) => state.currentRecipe);
  const recipes = useLiveQuery(
    () => db.recipes.orderBy('createdAt').reverse().limit(3).toArray(),
    [],
  );
  const today = useLiveQuery(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const logs = await db.mealLogs.where('consumedAt').between(start.getTime(), end.getTime(), true, false).toArray();
    return {
      count: logs.length,
      calories: logs.reduce((sum, meal) => sum + (meal.calories ?? 0), 0),
      incomplete: logs.some((meal) => meal.calories === null),
    };
  }, []);
  const { setCurrentRecipe } = useAppStore();
  return (
    <div className="home-page">
      <div className="compact-head">
        <h1>Hôm nay nấu gì?</h1>
        <p>Chụp nguyên liệu. Chọn món hợp với bạn.</p>
      </div>
      <section className="capture-card">
        <div className="capture-symbol">
          <Camera size={40} strokeWidth={1.5} />
        </div>
        <h2>Bắt đầu từ một bức ảnh</h2>
        <button className="btn" onClick={openCamera}>
          <Camera size={20} />
          Chụp nguyên liệu
        </button>
        <Link className="text-action" href="/scan">
          Chọn ảnh hoặc thêm nguyên liệu <ArrowRight size={16} />
        </Link>
      </section>
      <section className="home-today" aria-labelledby="today-heading">
        <div className="section-row"><h2 id="today-heading">Hôm nay</h2><Link href="/journal">Nhật ký <ArrowRight size={15} /></Link></div>
        <div className="home-today-grid">
          <div><CalendarDays size={19} /><strong>{today?.count ?? '—'}</strong><span>bữa đã ghi</span></div>
          <div><Flame size={19} /><strong>{today ? today.calories.toLocaleString('vi-VN') : '—'}</strong><span>kcal đã biết</span></div>
        </div>
        {today?.incomplete && <small>Một số món chưa có đủ dữ liệu dinh dưỡng nên tổng kcal đang thiếu.</small>}
        {today?.count === 0 && <small>Ghi món đã ăn để xem lại thói quen theo ngày.</small>}
      </section>
      {currentRecipe && (
        <Link className="resume-card" href="/cooking">
          <ChefHat size={26} />
          <div>
            <small>Tiếp tục vào bếp</small>
            <strong>{currentRecipe.name}</strong>
          </div>
          <ArrowRight size={20} />
        </Link>
      )}
      {!!recipes?.length && (
        <section className="recent-recipes">
          <div className="section-row">
            <h2>Món gần đây</h2>
            <Link href="/library">Xem tất cả</Link>
          </div>
          {recipes
            .filter((record) => record.recipe?.nutrition)
            .map((record) => (
              <Link
                key={record.id}
                href="/result"
                onClick={() => setCurrentRecipe(record.recipe)}
                className="simple-recipe"
              >
                <div>
                  <strong>{record.title}</strong>
                  <small>
                    {record.recipe.minutes} phút · {record.recipe.servings} phần
                  </small>
                </div>
                <ArrowRight size={20} />
              </Link>
            ))}
        </section>
      )}
    </div>
  );
}
