'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, Check, ImagePlus, RotateCcw, X } from 'lucide-react';
import { compressImage } from '@/lib/image';
import { Notice } from '@/components/notice';

interface Capture {
  id: string;
  image: string;
}
interface CameraContextValue {
  openCamera: () => void;
  capture: Capture | null;
  clearCapture: (id: string) => void;
}
const CameraContext = createContext<CameraContextValue | null>(null);

export function useCamera() {
  const context = useContext(CameraContext);
  if (!context) throw new Error('CameraProvider is required');
  return context;
}

function CameraDialog({ close, accept }: { close: () => void; accept: (image: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [image, setImage] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const release = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  useEffect(() => {
    dialog.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('popstate', close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('popstate', close);
    };
  }, [close]);

  useEffect(() => {
    if (image) return;
    let cancelled = false;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 } },
          audio: false,
        });
        if (cancelled || document.hidden) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;
        if (video.current) {
          video.current.srcObject = media;
          await video.current.play();
        }
      } catch (cause) {
        if (cancelled) return;
        const denied = cause instanceof DOMException && cause.name === 'NotAllowedError';
        setError(
          denied
            ? 'Chưa được cấp quyền camera. Bạn có thể chọn ảnh có sẵn.'
            : 'Không mở được camera. Chọn ảnh có sẵn hoặc thử lại.',
        );
      }
    }
    void start();
    function suspend() {
      if (document.hidden) {
        cancelled = true;
        release();
        setReady(false);
      }
    }
    document.addEventListener('visibilitychange', suspend);
    return () => {
      cancelled = true;
      release();
      document.removeEventListener('visibilitychange', suspend);
    };
  }, [image, attempt, release]);

  async function choose(file?: File) {
    if (!file) return;
    setProcessing(true);
    setError('');
    try {
      const result = await compressImage(file);
      release();
      setImage(result);
      setReady(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không đọc được ảnh.');
    } finally {
      setProcessing(false);
    }
  }
  function shoot() {
    const source = video.current;
    if (!source?.videoWidth || !source.videoHeight) return;
    const ratio = Math.min(1, 1000 / Math.max(source.videoWidth, source.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(source.videoWidth * ratio);
    canvas.height = Math.round(source.videoHeight * ratio);
    const context = canvas.getContext('2d');
    if (!context) {
      setError('Không chụp được ảnh. Hãy chọn ảnh từ thư viện.');
      return;
    }
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    setImage(canvas.toDataURL('image/jpeg', 0.85));
    release();
    setReady(false);
  }
  return (
    <dialog
      ref={dialog}
      className="camera-dialog"
      aria-labelledby="camera-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="camera-layout">
        <header className="camera-header">
          <h2 id="camera-title">{image ? 'Kiểm tra ảnh' : 'Chụp nguyên liệu'}</h2>
          <button className="icon-btn" aria-label="Đóng camera" onClick={close}>
            <X />
          </button>
        </header>
        <div className="camera-view">
          {image ? (
            <div
              className="camera-preview"
              style={{ backgroundImage: `url(${image})` }}
              role="img"
              aria-label="Ảnh nguyên liệu vừa chọn"
            />
          ) : (
            <>
              <video
                ref={video}
                autoPlay
                playsInline
                muted
                onLoadedData={() => setReady(true)}
                aria-label="Camera nguyên liệu"
              />
              <div className="camera-guide" aria-hidden="true" />
              <p className="camera-hint">Đặt nguyên liệu trong khung, tránh che khuất.</p>
            </>
          )}
        </div>
        <footer className="camera-footer">
          {error && <Notice kind="warning">{error}</Notice>}
          <p className="small">
            {image
              ? 'Ảnh sẽ được gửi đến Google Gemini khi bạn bấm “Dùng ảnh”.'
              : 'Ảnh chỉ được gửi nhận diện sau khi bạn xem lại.'}
          </p>
          {image ? (
            <div className="camera-controls">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setImage('');
                  setError('');
                  setAttempt((value) => value + 1);
                }}
              >
                <RotateCcw size={19} />
                Chụp lại
              </button>
              <button className="btn" onClick={() => accept(image)}>
                <Check size={19} />
                Dùng ảnh
              </button>
            </div>
          ) : (
            <div className="camera-controls">
              <label className="btn btn-secondary file-button">
                <ImagePlus size={20} />
                <span>Chọn ảnh</span>
                <input
                  type="file"
                  aria-label="Chọn ảnh trong camera"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={processing}
                  onChange={(event) => {
                    void choose(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
              <button
                className="shutter"
                aria-label="Chụp ảnh"
                disabled={!ready || processing}
                onClick={shoot}
              >
                <Camera size={30} />
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  release();
                  setReady(false);
                  setError('');
                  setAttempt((value) => value + 1);
                }}
              >
                Thử lại
              </button>
            </div>
          )}
          <Link className="btn btn-tertiary" href="/scan#manual-entry" onClick={close}>
            Nhập nguyên liệu bằng tay
          </Link>
        </footer>
      </div>
    </dialog>
  );
}

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [capture, setCapture] = useState<Capture | null>(null);
  const router = useRouter();
  const openCamera = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const clearCapture = useCallback(
    (id: string) => setCapture((current) => (current?.id === id ? null : current)),
    [],
  );
  function accept(image: string) {
    setCapture({ id: crypto.randomUUID(), image });
    setOpen(false);
    router.push('/scan');
  }
  return (
    <CameraContext.Provider value={{ openCamera, capture, clearCapture }}>
      {children}
      {open && <CameraDialog close={close} accept={accept} />}
    </CameraContext.Provider>
  );
}
