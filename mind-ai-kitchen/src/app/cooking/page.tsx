'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Mic, MicOff, Square, Volume2, VolumeX, Check } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { reviewRecipe } from '@/lib/recipe-review';
import { useCookingVoice } from '@/features/cooking/use-cooking-voice';
import type { VoiceCommand } from '@/features/cooking/commands';
import { StepTimer } from '@/features/cooking/step-timer';
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
  const [feedback, setFeedback] = useState('');
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
        setFeedback('Bước tiếp theo.');
      }
      if (action === 'prev') {
        move(-1);
        setFeedback('Bước trước.');
      }
      if (action === 'repeat') read(recipe?.steps[step]?.text || '');
      if (action === 'stop') setFeedback('Đã dừng đọc.');
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
            className={`focus-action-btn ${autoRead ? 'is-active' : ''}`}
            aria-label={autoRead ? 'Tắt đọc thành tiếng' : 'Bật đọc thành tiếng'}
            title={autoRead ? 'Đang bật tự đọc (Bấm để tắt)' : 'Tự đọc bước nấu (Bấm để bật)'}
            onClick={() => {
              if (autoRead) {
                stop();
                voice.setAutoRead(false);
              } else {
                voice.setAutoRead(true);
                if (recipe) speak(recipe.steps[step].text);
              }
            }}
          >
            {autoRead ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {/* Nút Mic / Giọng nói rảnh tay */}
          <button
            type="button"
            className={`focus-action-btn ${voice.listening ? 'is-active is-listening' : ''}`}
            aria-label={voice.listening ? 'Tắt micro rảnh tay' : 'Bật micro rảnh tay'}
            title={
              voice.listening
                ? 'Micro đang nghe lệnh giọng nói (Bấm để tắt)'
                : 'Bật micro điều khiển giọng nói (Bấm để bật)'
            }
            onClick={voice.toggleListening}
          >
            {voice.listening ? <Mic size={20} /> : <MicOff size={20} />}
            {voice.listening && <span className="mic-pulse-dot" />}
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
        {!!recipe.steps[step].durationSeconds && (
          <StepTimer
            key={step}
            seconds={recipe.steps[step].durationSeconds!}
            storageKey={'mind-cooking-timer-' + recipe.id + '-' + step}
          />
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
        <button
          className="btn focus-stop"
          onClick={() => {
            stop();
            setFeedback('Đã dừng đọc.');
          }}
        >
          <Square size={18} />
          Dừng đọc ngay
        </button>
        <details className="voice-options">
          <summary>
            Giọng nói và đọc hướng dẫn <Volume2 size={17} />
          </summary>
          <div className="voice-option-buttons">
            <button
              className="btn btn-secondary"
              aria-pressed={autoRead}
              onClick={() => {
                if (autoRead) stop();
                voice.setAutoRead(!autoRead);
              }}
            >
              {autoRead ? 'Tắt tự đọc' : 'Bật tự đọc'}
            </button>
            <button
              className="btn btn-secondary"
              aria-pressed={voice.listening}
              onClick={voice.toggleListening}
            >
              {voice.listening ? 'Tắt micro' : 'Bật micro rảnh tay'}
            </button>
            <button className="btn btn-secondary" onClick={() => speak(recipe.steps[step].text)}>
              Đọc lại
            </button>
          </div>
          <p className="small muted">Nói “tiếp”, “quay lại”, “đọc lại” hoặc “dừng”.</p>
        </details>
        {voice.error && <Notice kind="warning">{voice.error}</Notice>}
        <span className="sr-only" aria-live="polite">
          {feedback}
        </span>
      </footer>
    </div>
  );
}
