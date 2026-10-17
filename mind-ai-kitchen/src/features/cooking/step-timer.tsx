'use client';
import { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Timer, RotateCcw } from 'lucide-react';

export interface StepTimerHandle {
  start: () => boolean;
  pause: () => boolean;
  reset: () => boolean;
  isRunning: () => boolean;
  getRemaining: () => number;
}

interface Clock {
  remaining: number;
  deadline: number | null;
}

interface StepTimerProps {
  seconds: number;
  storageKey?: string;
  onStateChange?: (running: boolean, remaining: number) => void;
}

export const StepTimer = forwardRef<StepTimerHandle, StepTimerProps>(function StepTimer(
  { seconds, storageKey, onStateChange },
  ref,
) {
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
    onStateChange?.(next.deadline !== null, next.remaining);
    if (storageKey)
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* Timer still works without storage. */
      }
  }

  useImperativeHandle(
    ref,
    () => ({
      start: () => {
        if (!clock.remaining) return false;
        if (clock.deadline !== null) return false;
        save({ ...clock, deadline: Date.now() + clock.remaining * 1000 });
        return true;
      },
      pause: () => {
        if (clock.deadline === null) return false;
        save({ ...clock, deadline: null });
        return true;
      },
      reset: () => {
        save({ remaining: seconds, deadline: null });
        return true;
      },
      isRunning: () => clock.deadline !== null,
      getRemaining: () => clock.remaining,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clock, seconds, storageKey],
  );

  useEffect(() => {
    if (clock.deadline === null) return;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.ceil((clock.deadline! - Date.now()) / 1000));
      setClock((current) => ({ remaining: left, deadline: left ? current.deadline : null }));
      onStateChange?.(Boolean(left), left);
      if (!left && storageKey)
        try {
          sessionStorage.setItem(storageKey, JSON.stringify({ remaining: 0, deadline: null }));
        } catch {
          /* Timer still works without storage. */
        }
    }, 250);
    return () => clearInterval(tick);
  }, [clock.deadline, storageKey, onStateChange]);

  return (
    <div className={`timer focus-timer ${clock.deadline ? 'is-running' : ''}`}>
      <Timer size={24} />
      <strong aria-label="Thời gian còn lại">
        {Math.floor(clock.remaining / 60)}:{String(clock.remaining % 60).padStart(2, '0')}
      </strong>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={!clock.remaining}
        onClick={() =>
          save({ ...clock, deadline: clock.deadline ? null : Date.now() + clock.remaining * 1000 })
        }
      >
        {clock.deadline ? 'Tạm dừng' : 'Bắt đầu hẹn giờ'}
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label="Đặt lại hẹn giờ"
        title="Đặt lại hẹn giờ"
        onClick={() => save({ remaining: seconds, deadline: null })}
      >
        <RotateCcw size={20} />
      </button>
      {!clock.remaining && <span role="alert">Đã hết giờ — kiểm tra món ăn.</span>}
    </div>
  );
});
