'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Plus, Trash2, ArrowRight, Loader2, ImagePlus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Ingredient, RecipeResult } from '@/types/domain';
import { scanAllergens } from '@/lib/allergenSynonyms';
import { normalizeText } from '@/lib/text';
import { postJSON } from '@/lib/api-client';
import { compressImage } from '@/lib/image';
import { getRecipeContext, saveRecipeToDB } from '@/lib/db';
import { Notice } from '@/components/notice';
import { useCamera } from '@/features/camera/camera-provider';
import { AIScanner } from '@/components/ai-scanner';
import { DetectedPhotoViewer } from '@/components/detected-photo-viewer';

export default function ScanPage() {
  const router = useRouter();
  const {
    profile,
    scannedIngredients: ingredients,
    setScannedIngredients,
    setCurrentRecipe,
  } = useAppStore();
  const { openCamera, capture, clearCapture, manualRequested, clearManualRequest } = useCamera();
  const manualEntry = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!manualRequested) return;
    const timer = setTimeout(() => {
      if (manualEntry.current) {
        manualEntry.current.open = true;
        manualEntry.current.querySelector('input')?.focus();
      }
      clearManualRequest();
    }, 0);
    return () => clearTimeout(timer);
  }, [manualRequested, clearManualRequest]);
  const [name, setName] = useState('');
  const [grams, setGrams] = useState('');
  const [servings, setServings] = useState(2);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState<'image' | 'recipe' | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [candidate, setCandidate] = useState('');
  const [scanningImage, setScanningImage] = useState('');
  const [analyzedPhoto, setAnalyzedPhoto] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return sessionStorage.getItem('mind_kitchen_scanned_photo') ?? '';
    } catch {
      return '';
    }
  });
  const [activeIngredientId, setActiveIngredientId] = useState<string | null>(null);
  const [mockAI, setMockAI] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('mind_kitchen_mock_ai') === 'true';
    } catch {
      return false;
    }
  });

  function handleToggleMockAI() {
    const next = !mockAI;
    setMockAI(next);
    try {
      localStorage.setItem('mind_kitchen_mock_ai', String(next));
    } catch {
      // Ignore storage error
    }
  }
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);
  const audit = scanAllergens(
    ingredients.map((i) => i.name),
    profile.allergies,
  );
  const canGenerate = ingredients.length > 0 && !audit.hasRisk && reviewed && !busy && !candidate;
  function update(next: Ingredient[]) {
    setScannedIngredients(next);
    setReviewed(false);
    setInfo('');
  }
  function add() {
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 100) {
      setError('Tên nguyên liệu cần từ 2 đến 100 ký tự.');
      return;
    }
    if (ingredients.length >= 30) {
      setError('Tối đa 30 nguyên liệu.');
      return;
    }
    if (ingredients.some((i) => normalizeText(i.name) === normalizeText(clean))) {
      setError('Nguyên liệu đã có trong danh sách.');
      return;
    }
    update([
      ...ingredients,
      {
        id: crypto.randomUUID(),
        name: clean,
        grams: grams ? Number(grams) : undefined,
        confirmed: true,
        source: 'manual',
      },
    ]);
    setName('');
    setGrams('');
    setError('');
  }
  const recognize = useCallback(
    async (image: string) => {
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      setBusy('image');
      setScanningImage(image);
      setError('');
      setInfo('');
      setCandidate('');
      try {
        const data = await postJSON<{ ingredients: Ingredient[] }>(
          '/api/vision',
          { imageBase64: image },
          request.signal,
          { 'x-mock-ai': String(mockAI) },
        );
        if (request.signal.aborted) return;
        // Keep manual ingredients, replace photo batch with newly recognized items from this photo
        const manualItems = useAppStore
          .getState()
          .scannedIngredients.filter((i) => i.source === 'manual');
        if (manualItems.length + data.ingredients.length > 30)
          throw new Error('Danh sách vượt 30 nguyên liệu. Hãy bớt nguyên liệu rồi chụp lại.');
        setScannedIngredients([
          ...manualItems,
          ...data.ingredients.map((item) => ({
            ...item,
            id: crypto.randomUUID(),
            confirmed: false,
            source: 'photo' as const,
          })),
        ]);
        setAnalyzedPhoto(image);
        try {
          sessionStorage.setItem('mind_kitchen_scanned_photo', image);
        } catch {
          // Ignore storage error
        }
        setReviewed(false);
        setInfo(
          data.ingredients.length
            ? 'Kiểm tra lại tên, phần bị che và nhãn gia vị.'
            : 'Chưa nhận ra nguyên liệu. Chụp rõ hơn hoặc thêm nhanh bên dưới.',
        );
      } catch (cause) {
        if (!request.signal.aborted) {
          setCandidate(image);
          setError(cause instanceof Error ? cause.message : 'Không nhận diện được ảnh.');
        }
      } finally {
        if (controller.current === request) {
          setBusy(null);
          setScanningImage('');
        }
      }
    },
    [setScannedIngredients, mockAI],
  );
  useEffect(() => {
    if (!capture) return;
    const timer = setTimeout(() => {
      clearCapture(capture.id);
      void recognize(capture.image);
    }, 0);
    return () => clearTimeout(timer);
  }, [capture, clearCapture, recognize]);
  async function choose(file?: File) {
    if (!file) return;
    setError('');
    try {
      setCandidate(await compressImage(file));
      setReviewed(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không đọc được ảnh.');
    }
  }
  async function generate() {
    if (!canGenerate) return;
    const request = new AbortController();
    controller.current = request;
    setBusy('recipe');
    setError('');
    try {
      const context = await getRecipeContext();
      const recipe = await postJSON<RecipeResult>(
        '/api/recipe',
        { ingredients, profile, servings, context },
        request.signal,
        { 'x-mock-ai': String(mockAI) },
      );
      if (request.signal.aborted) return;
      setCurrentRecipe(recipe);
      await saveRecipeToDB(recipe);
      router.push('/result');
    } catch (cause) {
      if (!request.signal.aborted)
        setError(cause instanceof Error ? cause.message : 'Chưa lưu được công thức.');
    } finally {
      if (controller.current === request) setBusy(null);
    }
  }
  return (
    <div className="scan-page narrow-page">
      <div className="compact-head">
        <h1>{ingredients.length ? 'Kiểm tra nguyên liệu' : 'Chụp nguyên liệu'}</h1>
        <p>
          {ingredients.length
            ? 'Sửa nếu cần, rồi chọn cách nấu.'
            : 'Để AI nhận diện những gì bạn đang có.'}
        </p>
      </div>
      {mockAI && (
        <Notice kind="warning">
          Đang dùng dữ liệu mẫu. Tắt chế độ thử nghiệm để nhận diện thật.
        </Notice>
      )}
      {!busy && !candidate && (
        <section className={ingredients.length ? 'capture-tools' : 'capture-card'}>
          {!ingredients.length && (
            <div className="capture-symbol">
              <Camera size={40} strokeWidth={1.5} />
            </div>
          )}
          <button className="btn" onClick={openCamera}>
            <Camera size={21} />
            {ingredients.length ? 'Chụp thêm' : 'Mở camera'}
          </button>
          <label className="btn btn-secondary file-button">
            <ImagePlus size={20} />
            Chọn ảnh
            <input
              type="file"
              aria-label="Chọn ảnh nguyên liệu"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                void choose(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
          {!ingredients.length && (
            <small className="muted">Ảnh được gửi đến Google Gemini sau khi bạn xem lại.</small>
          )}
        </section>
      )}
      {candidate && (
        <section className="panel stack">
          <h2>Ảnh đã chọn</h2>
          <Image
            src={candidate}
            width={1000}
            height={700}
            unoptimized
            className="upload-preview"
            style={{ width: '100%', height: 'auto', display: 'block' }}
            alt="Ảnh nguyên liệu đã chọn"
          />
          <p className="small muted">Bấm nhận diện để gửi ảnh đến Google Gemini.</p>
          <div className="row wrap">
            <button className="btn" onClick={() => void recognize(candidate)}>
              Nhận diện ảnh <ArrowRight size={18} />
            </button>
            <button className="btn btn-secondary" onClick={() => setCandidate('')}>
              Bỏ ảnh
            </button>
          </div>
        </section>
      )}
      {busy === 'image' && scanningImage && (
        <AIScanner
          image={scanningImage}
          onCancel={() => {
            controller.current?.abort();
            setBusy(null);
            setScanningImage('');
            setInfo('Đã hủy yêu cầu.');
          }}
        />
      )}
      {busy && (!scanningImage || busy === 'recipe') && (
        <div className="scan-progress panel" role="status">
          <Loader2 className="spin" size={26} />
          <strong>
            {busy === 'image' ? 'Đang nhận diện nguyên liệu…' : 'Đang tạo công thức…'}
          </strong>
          <button
            className="btn btn-secondary"
            onClick={() => {
              controller.current?.abort();
              setBusy(null);
              setScanningImage('');
              setInfo('Đã hủy yêu cầu.');
            }}
          >
            Hủy
          </button>
        </div>
      )}
      {error && (
        <Notice kind="danger">
          {error}
          <p>
            <Link className="link" href="/library">
              Xem món đã lưu
            </Link>
          </p>
        </Notice>
      )}
      {info && (
        <p className="small muted" role="status">
          {info}
        </p>
      )}
      {!!ingredients.length && analyzedPhoto && (
        <DetectedPhotoViewer
          photo={analyzedPhoto}
          ingredients={ingredients}
          activeIngredientId={activeIngredientId}
          onSelectIngredient={setActiveIngredientId}
          onRetake={openCamera}
        />
      )}
      {!!ingredients.length && (
        <section className="panel ingredient-panel">
          <div className="section-row">
            <h2>Nguyên liệu</h2>
            <span className="small muted">{ingredients.length}/30</span>
          </div>
          <fieldset disabled={!!busy} className="plain-fieldset">
            {ingredients.map((item) => (
              <div
                className={`ingredient-row ${item.id === activeIngredientId ? 'is-active' : ''}`}
                key={item.id}
                id={`ingredient-row-${item.id}`}
                onMouseEnter={() => setActiveIngredientId(item.id)}
                onMouseLeave={() => setActiveIngredientId(null)}
              >
                <label className="field">
                  <span className="sr-only">Tên {item.name}</span>
                  <input
                    className="ingredient-name"
                    value={item.name}
                    maxLength={100}
                    minLength={2}
                    onChange={(event) =>
                      update(
                        ingredients.map((value) =>
                          value.id === item.id
                            ? { ...value, name: event.target.value, confirmed: false }
                            : value,
                        ),
                      )
                    }
                  />
                  <small>
                    {item.source === 'photo' && !item.confirmed
                      ? 'Từ ảnh · kiểm tra lại'
                      : 'Đã thêm'}
                  </small>
                </label>
                <label>
                  <span className="sr-only">Khối lượng {item.name} (g)</span>
                  <input
                    aria-label={'Khối lượng ' + item.name + ' (g)'}
                    type="number"
                    min="1"
                    max="10000"
                    placeholder="g"
                    value={item.grams ?? ''}
                    onChange={(event) =>
                      update(
                        ingredients.map((value) =>
                          value.id === item.id
                            ? {
                                ...value,
                                grams: event.target.value ? Number(event.target.value) : undefined,
                              }
                            : value,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  className="icon-btn"
                  aria-label={'Xóa ' + item.name}
                  onClick={() => update(ingredients.filter((value) => value.id !== item.id))}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </fieldset>
          <p className="small muted" style={{ marginTop: 16, marginBottom: 0 }}>
            Khối lượng có thể bổ sung sau. Chưa đủ định lượng sẽ chưa có tổng dinh dưỡng.
          </p>
        </section>
      )}
      <details ref={manualEntry} className="manual-entry panel">
        <summary>
          Thêm nguyên liệu bằng tay <Plus size={18} />
        </summary>
        <fieldset className="plain-fieldset" disabled={!!busy}>
          <form
            id="manual-entry"
            className="field-row"
            onSubmit={(event) => {
              event.preventDefault();
              add();
            }}
          >
            <label className="field">
              Tên nguyên liệu
              <input
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ví dụ: Trứng gà"
              />
            </label>
            <label className="field">
              Khối lượng (g)
              <input
                type="number"
                min="1"
                max="10000"
                value={grams}
                onChange={(event) => setGrams(event.target.value)}
                placeholder="Tùy chọn"
              />
            </label>
            <button className="btn" aria-label="Thêm nguyên liệu">
              <Plus size={20} />
            </button>
          </form>
        </fieldset>
      </details>
      {!!ingredients.length && (
        <section className="scan-review">
          <div className="review-profile">
            <span>
              Cần tránh: <strong>{profile.allergies || 'Chưa khai báo'}</strong>
            </span>
            <Link href="/onboarding">Sửa hồ sơ</Link>
          </div>
          {audit.hasRisk && (
            <Notice kind="danger">
              <strong>Cần bỏ hoặc thay nguyên liệu:</strong>
              <ul>
                {[...new Set(audit.flags.map((flag) => flag.ingredient))].map((value) => (
                  <li key={value}>{value}</li>
                ))}
              </ul>
            </Notice>
          )}
          <label className="field servings-field">
            Số phần ăn
            <select
              aria-label="Số phần ăn"
              value={servings}
              disabled={!!busy}
              onChange={(event) => {
                setServings(Number(event.target.value));
                setReviewed(false);
              }}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index} value={index + 1}>
                  {index + 1} phần
                </option>
              ))}
            </select>
          </label>
          <label className="check review-confirm">
            <input
              type="checkbox"
              checked={reviewed}
              disabled={!!busy || audit.hasRisk}
              onChange={(event) => {
                const checked = event.target.checked;
                setReviewed(checked);
                if (checked)
                  setScannedIngredients(ingredients.map((item) => ({ ...item, confirmed: true })));
              }}
            />
            <span>
              Tôi đã kiểm tra nguyên liệu và nhãn gia vị, bổ sung phần bị bỏ sót và đối chiếu dị
              ứng.
            </span>
          </label>
          <button className="btn full generate-button" disabled={!canGenerate} onClick={generate}>
            Tạo công thức <ArrowRight size={20} />
          </button>
          <p className="safety-caption">
            Ảnh không xác định được mọi thành phần ẩn hoặc nguy cơ nhiễm chéo.
          </p>
        </section>
      )}
      <details className="profile-history">
        <summary>Chế độ thử nghiệm</summary>
        <div className="test-mode-banner">
          <div className="test-mode-status">
            <span className={`test-dot ${mockAI ? 'is-active' : ''}`} />
            <span className="test-text">
              Bỏ qua API (Mock Test):{' '}
              <strong style={{ color: mockAI ? '#10b981' : 'var(--muted)' }}>
                {mockAI ? 'ĐANG BẬT' : 'ĐANG TẮT'}
              </strong>
            </span>
          </div>
          <button
            type="button"
            className={`test-toggle-btn ${mockAI ? 'is-on' : ''}`}
            onClick={handleToggleMockAI}
          >
            {mockAI ? 'Tắt bỏ qua' : 'Bật bỏ qua'}
          </button>
        </div>
      </details>
    </div>
  );
}
