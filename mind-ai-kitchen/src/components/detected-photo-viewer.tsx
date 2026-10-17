'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Camera, Sparkles, CheckCircle2 } from 'lucide-react';
import type { Ingredient } from '@/types/domain';

interface DetectedPhotoViewerProps {
  photo: string;
  ingredients: Ingredient[];
  activeIngredientId?: string | null;
  onSelectIngredient?: (id: string | null) => void;
  onRetake?: () => void;
}

export function DetectedPhotoViewer({
  photo,
  ingredients,
  activeIngredientId,
  onSelectIngredient,
  onRetake,
}: DetectedPhotoViewerProps) {
  const [showBoxes, setShowBoxes] = useState(true);

  // Filter only photo-detected ingredients or manual ones associated
  const photoIngredients = ingredients.filter((item) => item.source === 'photo');
  const displayItems = photoIngredients.length > 0 ? photoIngredients : ingredients;

  return (
    <div className="detected-viewer-card">
      <div className="detected-viewer-header">
        <div className="detected-badge">
          <Sparkles size={15} className="detected-badge-icon" />
          <span>AI Vision · Nhận diện {displayItems.length} nguyên liệu</span>
        </div>
        <div className="detected-header-actions">
          <button
            type="button"
            className="detected-tool-btn"
            onClick={() => setShowBoxes((prev) => !prev)}
            title={showBoxes ? 'Ẩn khoanh vùng' : 'Hiện khoanh vùng'}
          >
            {showBoxes ? <Eye size={15} /> : <EyeOff size={15} />}
            <span>{showBoxes ? 'Ẩn vùng' : 'Hiện vùng'}</span>
          </button>
          {onRetake && (
            <button
              type="button"
              className="detected-tool-btn"
              onClick={onRetake}
              title="Chụp lại hoặc chọn ảnh khác"
            >
              <Camera size={15} />
              <span>Chụp lại</span>
            </button>
          )}
        </div>
      </div>

      <div className="detected-photo-container">
        <Image
          src={photo}
          alt="Ảnh nguyên liệu đã phân tích"
          width={1000}
          height={750}
          unoptimized
          className="detected-photo-img"
          style={{ width: '100%', height: 'auto', display: 'block' }}
          priority
        />

        {showBoxes && (
          <div className="detected-overlay-layer" aria-label="Các vùng nguyên liệu được nhận diện">
            {displayItems
              .filter(
                (item): item is typeof item & { box2d: [number, number, number, number] } =>
                  !!item.box2d && item.box2d.length === 4,
              )
              .map((item) => {
                let [ymin, xmin, ymax, xmax] = item.box2d;
                if (ymax <= 1 && xmax <= 1) {
                  ymin *= 1000;
                  xmin *= 1000;
                  ymax *= 1000;
                  xmax *= 1000;
                }
                const realYmin = Math.max(0, Math.min(1000, Math.min(ymin, ymax)));
                const realXmin = Math.max(0, Math.min(1000, Math.min(xmin, xmax)));
                const top = `${(realYmin / 10).toFixed(2)}%`;
                const left = `${(realXmin / 10).toFixed(2)}%`;
                const width = `${Math.max(3, Math.abs(xmax - xmin) / 10).toFixed(2)}%`;
                const height = `${Math.max(3, Math.abs(ymax - ymin) / 10).toFixed(2)}%`;

                const isActive = activeIngredientId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`detected-box ${isActive ? 'is-active' : ''}`}
                    style={{ top, left, width, height }}
                    onMouseEnter={() => onSelectIngredient?.(item.id)}
                    onMouseLeave={() => onSelectIngredient?.(null)}
                    onClick={() => {
                      onSelectIngredient?.(item.id);
                      // Scroll to the ingredient row if present in DOM
                      const el = document.getElementById(`ingredient-row-${item.id}`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Nguyên liệu: ${item.name}`}
                  >
                    {/* Viewfinder corner brackets */}
                    <span className="corner top-left" />
                    <span className="corner top-right" />
                    <span className="corner bottom-left" />
                    <span className="corner bottom-right" />

                    {/* Label badge */}
                    <div className="detected-tag">
                      <CheckCircle2 size={12} className="detected-tag-check" />
                      <span className="detected-tag-text">{item.name}</span>
                      {item.grams && <span className="detected-tag-grams">{item.grams}g</span>}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div className="detected-viewer-footer">
        <p className="detected-tip">
          💡 Rà chuột hoặc chạm vào ô khoanh vùng để đối chiếu với danh sách bên dưới.
        </p>
      </div>
    </div>
  );
}
