'use client';
import Link from 'next/link';
import { Camera, ArrowRight, ChefHat } from 'lucide-react';
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
