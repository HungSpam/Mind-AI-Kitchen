'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Mic, MicOff, Square, Volume2, Check, Timer } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { reviewRecipe } from '@/lib/recipe-review';
import { useCookingVoice } from '@/features/cooking/use-cooking-voice';
import type { VoiceCommand } from '@/features/cooking/commands';
import { StepTimer, type StepTimerHandle } from '@/features/cooking/step-timer';
import { Notice } from '@/components/notice';

function restoreStep(id: string, total: number) {
  try {
    const value = Number(sessionStorage.getItem('mind-cooking-step-' + id));
    return Number.isInteger(value) && value >= 0 && value < total ? value : 0;
  } catch {
    return 0;
  }
}
export default function CookingPage() {
  const { currentRecipe, profile } = useAppStore();
  const recipe = useMemo(
    () => (currentRecipe ? reviewRecipe(currentRecipe, profile) : null),
    [currentRecipe, profile],
  );
  const [step, setStep] = useState(() =>
    recipe ? restoreStep(recipe.id, recipe.steps.length) : 0,
  );
  const [customTimers, setCustomTimers] = useState<Record<number, number>>({});
  const timerRef = useRef<StepTimerHandle>(null);

  const safe =
    !!recipe && !recipe.audit.hasRisk && recipe.ingredients.every((item) => item.confirmed);
  const move = useCallback(
    (direction: number) => {
      if (!recipe) return;
      setStep((current) => Math.max(0, Math.min(recipe.steps.length - 1, current + direction)));
    },
    [recipe],
  );
  const command = useCallback(
    (action: VoiceCommand, read: (text: string) => void) => {
      if (!safe) return;
      if (action === 'next') {
        move(1);
        return step === recipe!.steps.length - 1
          ? 'Đây là bước cuối. Bấm “Xong món” khi nấu xong.'
          : 'Đã chuyển sang bước tiếp theo.';
      }
      if (action === 'prev') {
        move(-1);
        return step === 0 ? 'Bạn đang ở bước đầu tiên.' : 'Đã quay lại bước trước.';
      }
      if (action === 'repeat' || action === 'read') {
        read(recipe?.steps[step]?.text || '');
        return action === 'repeat' ? 'Đang đọc lại bước này.' : 'Đang đọc bước này.';
      }
      if (action === 'timer-start') {
        if (timerRef.current) {
          const started = timerRef.current.start();
          return started ? 'Đã bắt đầu hẹn giờ.' : 'Hẹn giờ đang chạy rồi.';
        }
        setCustomTimers((prev) => ({ ...prev, [step]: 180 }));
        return 'Đã bật hẹn giờ 3 phút cho bước này.';
      }
      if (action === 'timer-stop') {
        if (timerRef.current) {
          const paused = timerRef.current.pause();
          return paused ? 'Đã tạm dừng hẹn giờ.' : 'Hẹn giờ đang dừng sẵn.';
        }
        return 'Chưa có hẹn giờ nào đang chạy.';
      }
      if (action === 'timer-reset') {
        if (timerRef.current) {
          timerRef.current.reset();
          return 'Đã đặt lại hẹn giờ.';
        }
        return 'Chưa có hẹn giờ để đặt lại.';
      }
    },
    [move, recipe, step, safe],
  );
  const voice = useCookingVoice(command);
  const { autoRead, speak, stop } = voice;
  useEffect(() => {
    if (autoRead && safe && recipe) speak(recipe.steps[step].text);
    return () => stop();
  }, [autoRead, safe, recipe, step, speak, stop]);
  useEffect(() => {
    if (!recipe || !safe) return;
    try {
      sessionStorage.setItem('mind-cooking-step-' + recipe.id, String(step));
    } catch {
      /* Session storage may be unavailable. */
    }
  }, [recipe, safe, step]);
  useEffect(() => {
    if (!safe || !('wakeLock' in navigator)) return;
    let cancelled = false;
    let lock: WakeLockSentinel | undefined;
    async function keepAwake() {
      if (document.hidden) return;
      try {
        const result = await navigator.wakeLock.request('screen');
        if (cancelled) await result.release();
        else lock = result;
      } catch {
        /* Cooking still works without wake lock. */
      }
    }
    void keepAwake();
    document.addEventListener('visibilitychange', keepAwake);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', keepAwake);
      void lock?.release().catch(() => {});
    };
  }, [safe]);
  if (!recipe)
    return (
      <div className="empty panel">
        <h1>Chọn món để vào bếp</h1>
        <Link className="btn" href="/library">
          Món đã lưu
        </Link>
      </div>
    );
  if (!safe)
    return (
      <div className="stack">
        <Notice kind="danger">
          Công thức chưa phù hợp với hồ sơ dị ứng hoặc còn nguyên liệu chưa xác nhận.
        </Notice>
        <Link className="btn" href="/result">
          Kiểm tra công thức
        </Link>
      </div>
    );
  const last = step === recipe.steps.length - 1;
  const currentDuration = recipe.steps[step].durationSeconds || customTimers[step];
  return (
    <div className="cooking-focus">
      <header className="focus-header">
        <Link className="btn btn-tertiary focus-exit-btn" href="/result" onClick={stop}>
          <ArrowLeft size={20} />
          <span>Thoát</span>
        </Link>
        <span className="focus-step-indicator">
          Bước {step + 1} / {recipe.steps.length}
        </span>
        <div className="focus-header-actions">
          {/* Nút Loa / Đọc to thành tiếng */}
          <button
            type="button"
            className={`focus-action-btn ${voice.speaking ? 'is-active is-speaking' : autoRead ? 'is-active' : ''}`}
            aria-label={voice.speaking ? 'Dừng đọc' : 'Đọc bước này'}
            title={voice.speaking ? 'Đang đọc (Bấm để dừng)' : 'Đọc bước này'}
            onClick={() => {
              if (voice.speaking) {
                stop();
              } else {
                speak(recipe.steps[step].text);
              }
            }}
          >
            {voice.speaking ? <Square size={18} /> : <Volume2 size={20} />}
          </button>
          {/* Nút Micro */}
          <button
            type="button"
            className={`focus-action-btn ${voice.listening ? 'is-active is-listening' : ''}`}
            aria-label={voice.listening ? 'Tắt micro' : 'Bật micro'}
            title={voice.listening ? 'Micro đang bật' : 'Micro đang tắt'}
            onClick={voice.toggleListening}
          >
            {voice.listening && voice.status !== 'paused' ? (
              <Mic size={20} />
            ) : (
              <MicOff size={20} />
            )}
            {voice.listening && voice.status !== 'paused' && (
              <span className="mic-pulse-dot" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>
      <div
        className="focus-progress"
        aria-label={'Tiến độ ' + (step + 1) + '/' + recipe.steps.length}
      >
        <span style={{ width: ((step + 1) / recipe.steps.length) * 100 + '%' }} />
      </div>
      <section className="focus-instruction" aria-live="polite">
        <h1>{recipe.steps[step].text}</h1>
        {currentDuration ? (
          <StepTimer
            ref={timerRef}
            key={step}
            seconds={currentDuration}
            storageKey={'mind-cooking-timer-' + recipe.id + '-' + step}
          />
        ) : (
          <button
            type="button"
            className="btn btn-tertiary"
            onClick={() => setCustomTimers((prev) => ({ ...prev, [step]: 180 }))}
          >
            <Timer size={18} />
            <span>+ Hẹn giờ 3 phút</span>
          </button>
        )}
      </section>
      <footer className="focus-controls">
        <div className="focus-navigation">
          <button
            className="btn btn-secondary"
            disabled={!step}
            onClick={() => {
              stop();
              move(-1);
            }}
          >
            <ArrowLeft size={23} />
            Bước trước
          </button>
          {last ? (
            <Link className="btn" href="/cooking/complete" onClick={stop}>
              Xong món <Check size={23} />
            </Link>
          ) : (
            <button
              className="btn"
              onClick={() => {
                stop();
                move(1);
              }}
            >
              Bước tiếp <ArrowRight size={23} />
            </button>
          )}
        </div>
        <section className="cooking-audio" aria-label="Điều khiển giọng nói">
          <div className="cooking-audio-buttons">
            <button
              className="btn btn-secondary cooking-mic-toggle"
              aria-pressed={voice.listening}
              onClick={voice.toggleListening}
            >
              {voice.listening && voice.status !== 'paused' ? (
                <Mic size={22} />
              ) : (
                <MicOff size={22} />
              )}
              {voice.listening ? 'Tắt micro' : 'Bật micro'}
            </button>
            <button
              className={`btn btn-secondary cooking-read${voice.speaking ? ' is-speaking' : ''}`}
              onClick={() => (voice.speaking ? stop() : speak(recipe.steps[step].text))}
            >
              {voice.speaking ? <Square size={20} /> : <Volume2 size={22} />}
              {voice.speaking ? 'Dừng đọc' : 'Đọc bước này'}
            </button>
          </div>
          <div className="cooking-audio-settings">
            <p className="cooking-mic-state" role="status" aria-live="polite" aria-atomic="true">
              <span className={`mic-status-dot is-${voice.status}`} aria-hidden="true" />
              {voice.status === 'paused'
                ? 'Đang đọc · Micro tạm nghỉ'
                : voice.status === 'starting'
                  ? 'Đang mở micro…'
                  : voice.status === 'reconnecting'
                    ? 'Đang kết nối lại…'
                    : voice.status === 'processing'
                      ? 'Đang xử lý câu nói…'
                      : voice.status === 'hearing'
                        ? 'Đang nghe bạn nói…'
                        : voice.status === 'ready'
                          ? 'Đang nghe'
                          : 'Micro đang tắt'}
            </p>
            <label className="cooking-auto-read">
              <input
                type="checkbox"
                checked={autoRead}
                onChange={(event) => voice.setAutoRead(event.target.checked)}
              />
              Tự đọc mỗi bước
            </label>
          </div>
          {voice.listening && (
            <div className="cooking-voice-result">
              {voice.status === 'paused' ? (
                <p>Đọc xong, micro sẽ tự nghe lại.</p>
              ) : (
                <>
                  {voice.transcript && (
                    <p className="cooking-transcript">Đã nghe: “{voice.transcript}”</p>
                  )}
                  <p role="status" aria-live="polite">
                    {voice.response ||
                      (autoRead
                        ? 'Nói “bước tiếp”, “quay lại”, “hẹn giờ” hoặc “dừng”.'
                        : 'Nói “đọc”, “bước tiếp”, “quay lại”, “hẹn giờ” hoặc “dừng”.')}
                  </p>
                </>
              )}
            </div>
          )}
          {voice.error && <Notice kind="warning">{voice.error}</Notice>}
        </section>
      </footer>
    </div>
  );
}
