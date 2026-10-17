'use client';

import Image from 'next/image';
import { Sparkles } from 'lucide-react';

interface AIScannerProps {
  image: string;
  onCancel: () => void;
}

export function AIScanner({ image, onCancel }: AIScannerProps) {
  return (
    <section className="panel" style={{ padding: '20px', borderRadius: '16px' }} role="status">
      <style>{`
        @keyframes laserSweep {
          0% {
            top: 2%;
            opacity: 0.85;
          }
          50% {
            opacity: 1;
          }
          100% {
            top: 96%;
            opacity: 0.85;
          }
        }
        @keyframes dotPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.75);
          }
        }
        @keyframes progressBarMove {
          0% {
            left: -40%;
          }
          100% {
            left: 100%;
          }
        }
        .ai-scanner-box {
          position: relative;
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
          background: #0f1612;
          box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.4);
          line-height: 0;
        }
        .ai-scanner-img {
          width: 100%;
          height: auto;
          display: block;
          filter: brightness(0.92) contrast(1.04);
        }
        .ai-scanner-overlay {
          position: absolute;
          inset: 0;
          background: rgba(15, 30, 22, 0.2);
          pointer-events: none;
        }
        .ai-laser-beam {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent 0%, #10b981 25%, #86efac 50%, #10b981 75%, transparent 100%);
          box-shadow: 0 0 16px 3px rgba(16, 185, 129, 0.8);
          animation: laserSweep 2.2s ease-in-out infinite alternate;
          z-index: 5;
          pointer-events: none;
        }
        .ai-laser-beam::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 44px;
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.22) 0%, transparent 100%);
          pointer-events: none;
        }
        .ai-corner {
          position: absolute;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.85);
          z-index: 6;
          pointer-events: none;
        }
        .ai-corner-tl { top: 12px; left: 12px; border-right: 0; border-bottom: 0; }
        .ai-corner-tr { top: 12px; right: 12px; border-left: 0; border-bottom: 0; }
        .ai-corner-bl { bottom: 12px; left: 12px; border-right: 0; border-top: 0; }
        .ai-corner-br { bottom: 12px; right: 12px; border-left: 0; border-top: 0; }
        .ai-badge {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(14, 24, 18, 0.8);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #f7f6f0;
          padding: 5px 14px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 7px;
          z-index: 7;
          border: 1px solid rgba(255, 255, 255, 0.15);
          white-space: nowrap;
        }
        .ai-badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 6px #34d399;
          animation: dotPulse 1.2s infinite;
        }
        .ai-progress-track {
          width: 100%;
          max-width: 260px;
          height: 4px;
          background: var(--line);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        .ai-progress-bar {
          width: 45%;
          height: 100%;
          background: var(--green);
          border-radius: 4px;
          position: absolute;
          animation: progressBarMove 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* Image with laser scanning effect */}
      <div className="ai-scanner-box">
        <Image
          src={image}
          alt="Ảnh nguyên liệu đang phân tích"
          width={800}
          height={600}
          unoptimized
          className="ai-scanner-img"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        <div className="ai-scanner-overlay" />

        {/* Viewfinder corners */}
        <div className="ai-corner ai-corner-tl" />
        <div className="ai-corner ai-corner-tr" />
        <div className="ai-corner ai-corner-bl" />
        <div className="ai-corner ai-corner-br" />

        {/* Laser beam */}
        <div className="ai-laser-beam" />

        {/* Top badge */}
        <div className="ai-badge">
          <span className="ai-badge-dot" />
          <span>Đang nhận diện AI...</span>
        </div>
      </div>

      {/* Bottom control & status */}
      <div
        style={{
          marginTop: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink)' }}>
          <Sparkles size={18} style={{ color: 'var(--orange)' }} />
          <strong style={{ fontSize: '16px' }}>Đang nhận diện nguyên liệu…</strong>
        </div>
        <p className="small muted" style={{ margin: '6px 0 16px', maxWidth: '360px' }}>
          Đang phân tích hình ảnh để tìm rau củ, thực phẩm và gia vị có trong bếp của bạn.
        </p>

        {/* Scanning progress bar */}
        <div className="ai-progress-track">
          <div className="ai-progress-bar" />
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: '16px', minHeight: '40px', padding: '8px 24px', fontSize: '13px' }}
          onClick={onCancel}
        >
          Hủy
        </button>
      </div>
    </section>
  );
}
