'use client';
import { useEffect, useState } from 'react';
import { Timer, RotateCcw } from 'lucide-react';
interface Clock {
  remaining: number;
  deadline: number | null;
}
export function StepTimer({ seconds, storageKey }: { seconds: number; storageKey?: string }) {
  const [clock, setClock] = useState<Clock>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey || '') || 'null');
      if (
        saved &&
        Number.isFinite(saved.remaining) &&
        saved.remaining >= 0 &&
        saved.remaining <= seconds &&
        (saved.deadline === null || Number.isFinite(saved.deadline))
      )
        return {
          remaining: saved.deadline
            ? Math.max(0, Math.ceil((saved.deadline - Date.now()) / 1000))
            : saved.remaining,
          deadline: saved.deadline || null,
        };
    } catch {
      /* Invalid or unavailable session data falls back to a new timer. */
    }
    return { remaining: seconds, deadline: null };
  });
  function save(next: Clock) {
    setClock(next);
    if (storageKey)
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* Timer still works without storage. */
      }
  }
  useEffect(() => {
    if (clock.deadline === null) return;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.ceil((clock.deadline! - Date.now()) / 1000));
      setClock((current) => ({ remaining: left, deadline: left ? current.deadline : null }));
      if (!left && storageKey)
        try {
          sessionStorage.setItem(storageKey, JSON.stringify({ remaining: 0, deadline: null }));
        } catch {
          /* Timer still works without storage. */
        }
    }, 250);
    return () => clearInterval(tick);
  }, [clock.deadline, storageKey]);
  return (
    <div className="timer focus-timer">
      <Timer size={24} />
      <strong aria-label="Thời gian còn lại">
        {Math.floor(clock.remaining / 60)}:{String(clock.remaining % 60).padStart(2, '0')}
      </strong>
      <button
        className="btn btn-secondary"
        disabled={!clock.remaining}
        onClick={() =>
          save({ ...clock, deadline: clock.deadline ? null : Date.now() + clock.remaining * 1000 })
        }
      >
        {clock.deadline ? 'Tạm dừng' : 'Bắt đầu hẹn giờ'}
      </button>
      <button
        className="icon-btn"
        aria-label="Đặt lại hẹn giờ"
        onClick={() => save({ remaining: seconds, deadline: null })}
      >
        <RotateCcw size={20} />
      </button>
      {!clock.remaining && <span role="alert">Đã hết giờ — kiểm tra món ăn.</span>}
    </div>
  );
}
