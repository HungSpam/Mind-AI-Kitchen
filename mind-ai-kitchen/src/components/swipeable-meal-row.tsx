'use client';

import { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeableMealRowProps {
  id: string;
  isOpen: boolean;
  onOpen: (id: string) => void;
  onClose: (id: string) => void;
  onDelete: () => void;
  recipeName: string;
  mealType: string;
  dateStr: string;
  servings: number;
  calories: number | null;
}

const ACTION_WIDTH = 80; // pixels

export function SwipeableMealRow({
  id,
  isOpen,
  onOpen,
  onClose,
  onDelete,
  recipeName,
  mealType,
  dateStr,
  servings,
  calories,
}: SwipeableMealRowProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const isHorizontalGesture = useRef<boolean | null>(null);

  const currentTranslate = isDragging
    ? (isOpen ? -ACTION_WIDTH : 0) + dragOffset
    : isOpen
      ? -ACTION_WIDTH
      : 0;

  // Touch handlers
  function handleTouchStart(e: React.TouchEvent) {
    dragStartX.current = e.touches[0].clientX;
    dragStartY.current = e.touches[0].clientY;
    isHorizontalGesture.current = null;
    setIsDragging(true);
    setDragOffset(0);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - dragStartX.current;
    const dy = currentY - dragStartY.current;

    if (isHorizontalGesture.current === null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        isHorizontalGesture.current = Math.abs(dx) > Math.abs(dy);
      }
    }

    if (!isHorizontalGesture.current) {
      return;
    }

    if (isOpen) {
      if (dx > 0) {
        setDragOffset(Math.min(dx, ACTION_WIDTH));
      } else {
        setDragOffset(dx * 0.2); // rubber band resistance
      }
    } else {
      if (dx < 0) {
        setDragOffset(Math.max(dx, -ACTION_WIDTH - 20));
      } else {
        setDragOffset(dx * 0.2);
      }
    }
  }

  function handleTouchEnd() {
    if (!isDragging) return;
    setIsDragging(false);

    if (isHorizontalGesture.current) {
      if (isOpen) {
        if (dragOffset > 24) {
          onClose(id);
        } else {
          onOpen(id);
        }
      } else {
        if (dragOffset < -28) {
          onOpen(id);
        } else {
          onClose(id);
        }
      }
    }
    setDragOffset(0);
    isHorizontalGesture.current = null;
  }

  // Mouse drag support for desktop
  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    isHorizontalGesture.current = true;
    setIsDragging(true);
    setDragOffset(0);

    function onMouseMove(moveEvent: MouseEvent) {
      const dx = moveEvent.clientX - dragStartX.current;
      if (isOpen) {
        if (dx > 0) setDragOffset(Math.min(dx, ACTION_WIDTH));
        else setDragOffset(dx * 0.2);
      } else {
        if (dx < 0) setDragOffset(Math.max(dx, -ACTION_WIDTH - 20));
        else setDragOffset(dx * 0.2);
      }
    }

    function onMouseUp(upEvent: MouseEvent) {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setIsDragging(false);
      const totalDx = upEvent.clientX - dragStartX.current;
      if (isOpen) {
        if (totalDx > 24) onClose(id);
        else onOpen(id);
      } else {
        if (totalDx < -28) onOpen(id);
        else onClose(id);
      }
      setDragOffset(0);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  return (
    <div className="swipeable-wrapper">
      {/* Background delete action revealed upon swipe */}
      <button
        type="button"
        className="swipeable-action-delete"
        style={{
          width: `${Math.max(ACTION_WIDTH, Math.abs(currentTranslate))}px`,
          opacity: isDragging || isOpen ? 1 : 0,
          visibility: isDragging || isOpen ? 'visible' : 'hidden',
          pointerEvents: isDragging || isOpen ? 'auto' : 'none',
        }}
        aria-label={`Xóa bữa ăn ${recipeName}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: `${ACTION_WIDTH}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
          }}
        >
          <Trash2 size={18} />
          <span>Xóa</span>
        </div>
      </button>

      {/* Foreground meal row content */}
      <div
        className="swipeable-content"
        style={{
          transform: `translateX(${currentTranslate}px)`,
          transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onClick={() => {
          if (isOpen) {
            onClose(id);
          }
        }}
      >
        <div className="meal-info">
          <strong>{recipeName}</strong>
          <small>
            {mealType} · {dateStr} · {servings} phần
          </small>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <strong style={{ whiteSpace: 'nowrap' }}>
            {calories === null ? '—' : calories}
            <small> kcal</small>
          </strong>
          {/* Subtle swipe hint indicator */}
          <span
            className="swipe-hint"
            aria-hidden="true"
            title="Vuốt sang trái để xóa"
          >
            ‹
          </span>
        </div>
      </div>
    </div>
  );
}
