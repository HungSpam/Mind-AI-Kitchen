'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { reviewRecipe } from '@/lib/recipe-review';
import { logCompletedMeal } from '@/lib/db';
import type { MealType } from '@/types/domain';
import { Notice } from '@/components/notice';

export default function CompleteMealPage() {
  const { currentRecipe, profile, setCurrentRecipe } = useAppStore();
  const recipe = useMemo(
    () => (currentRecipe ? reviewRecipe(currentRecipe, profile) : null),
    [currentRecipe, profile],
  );
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>(() => {
    const hour = new Date().getHours();
    return hour < 10 ? 'Bữa Sáng' : hour < 15 ? 'Bữa Trưa' : 'Bữa Tối';
  });
  const [portions, setPortions] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sessionId] = useState(() => {
    const key = 'mind-cooking-session-' + (currentRecipe?.id || 'empty');
    try {
      const existing = sessionStorage.getItem(key);
      if (existing) return existing;
      const id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
      return id;
    } catch {
      return crypto.randomUUID();
    }
  });
  async function save() {
    if (
      !recipe ||
      recipe.audit.hasRisk ||
      saving ||
      !recipe.ingredients.every((item) => item.confirmed)
    )
      return;
    setSaving(true);
    setError('');
    try {
      await logCompletedMeal(recipe, mealType, portions, sessionId);
      try {
        sessionStorage.removeItem('mind-cooking-session-' + recipe.id);
        sessionStorage.removeItem('mind-cooking-step-' + recipe.id);
        recipe.steps.forEach((_, index) =>
          sessionStorage.removeItem('mind-cooking-timer-' + recipe.id + '-' + index),
        );
      } catch {
        /* Meal is already saved. */
      }
      setCurrentRecipe(null);
      router.push('/journal');
    } catch {
      setSaving(false);
      setError('Chưa lưu được bữa ăn. Hãy thử lại.');
    }
  }
  if (!recipe)
    return (
      <div className="panel empty">
        <h1>Chưa có món đang nấu</h1>
        <Link className="btn" href="/library">
          Món đã lưu
        </Link>
      </div>
    );
  if (recipe.audit.hasRisk || !recipe.ingredients.every((item) => item.confirmed))
    return (
      <Notice kind="danger">Kiểm tra lại công thức và hồ sơ dị ứng trước khi ghi bữa ăn.</Notice>
    );
  return (
    <div className="narrow-page meal-complete">
      <Link className="btn btn-tertiary" href="/cooking">
        <ArrowLeft size={20} />
        Quay lại món
      </Link>
      <div className="compact-head">
        <div className="complete-symbol">
          <Check size={32} />
        </div>
        <h1>Món đã sẵn sàng</h1>
        <p>{recipe.name}</p>
      </div>
      <section className="panel stack">
        <label className="field">
          Bữa ăn
          <select
            aria-label="Bữa ăn"
            value={mealType}
            onChange={(event) => setMealType(event.target.value as MealType)}
          >
            {(['Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Bữa Phụ'] as const).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Số phần đã ăn
          <input
            type="number"
            min=".25"
            step=".25"
            max={recipe.servings}
            value={portions}
            onChange={(event) => setPortions(Number(event.target.value))}
          />
        </label>
        {error && <Notice kind="danger">{error}</Notice>}
        <button
          className="btn full"
          onClick={save}
          disabled={
            saving || !Number.isFinite(portions) || portions <= 0 || portions > recipe.servings
          }
        >
          {saving ? 'Đang lưu…' : 'Hoàn thành & lưu bữa ăn'}
        </button>
      </section>
    </div>
  );
}
