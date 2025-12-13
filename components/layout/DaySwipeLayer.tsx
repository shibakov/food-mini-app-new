import React, { useRef, TouchEvent } from 'react';

interface DaySwipeLayerProps {
  onSwipeStart?: () => void;
  onSwipeProgress?: (dx: number) => void;
  onSwipeEnd?: (shouldSwitch: boolean, direction: 'left' | 'right') => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * A gesture wrapper that detects horizontal swipes to switch days.
 * 
 * Features:
 * - 1:1 Gesture Tracking: Reports precise dx for fluid animations.
 * - Direction Locking: Distinguishes between vertical scroll and horizontal swipe.
 * - Conflict Avoidance: Ignores swipes on internal horizontally scrollable elements.
 */
export const DaySwipeLayer: React.FC<DaySwipeLayerProps> = ({ 
  onSwipeStart,
  onSwipeProgress,
  onSwipeEnd,
  children,
  className = '', 
  disabled = false 
}) => {
  const touchStart = useRef<{ x: number, y: number } | null>(null);
  const isLocked = useRef<'horizontal' | 'vertical' | null>(null);
  
  // Configuration
  const SWIPE_THRESHOLD = 80; // px to commit to switch
  const VELOCITY_THRESHOLD = 0.5; // px/ms

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    // 1. Ignore if text input is active
    const activeEl = document.activeElement as HTMLElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;

    // 2. Ignore if interacting with internal horizontal scroll containers
    let el = e.target as HTMLElement | null;
    let isInternalScroll = false;
    while (el && el !== e.currentTarget) {
        if (el.classList.contains('overflow-x-auto') || el.classList.contains('snap-x')) {
             isInternalScroll = true;
             break;
        }
        el = el.parentElement;
    }
    if (isInternalScroll) return;

    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    isLocked.current = null;
    
    if (onSwipeStart) onSwipeStart();
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current || disabled) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStart.current.x;
    const diffY = currentY - touchStart.current.y;

    // Determine Lock Direction
    if (!isLocked.current) {
      if (Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY)) {
        isLocked.current = 'horizontal';
      } else if (Math.abs(diffY) > 10) {
        isLocked.current = 'vertical';
      }
    }

    if (isLocked.current === 'horizontal') {
      // Prevent browser back/forward navigation or native scroll
      if (e.cancelable) e.preventDefault();
      
      if (onSwipeProgress) {
        onSwipeProgress(diffX);
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current || disabled || isLocked.current !== 'horizontal') {
      touchStart.current = null;
      isLocked.current = null;
      // If we started a swipe but it wasn't valid, ensure we reset any offset
      if (onSwipeEnd) onSwipeEnd(false, 'left'); 
      return;
    }

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };
    
    const diffX = touchEnd.x - touchStart.current.x;
    const direction = diffX > 0 ? 'right' : 'left'; // Right = Prev Day, Left = Next Day
    const absX = Math.abs(diffX);

    // Velocity check (optional simple implementation)
    // For now, rely on distance threshold
    const shouldSwitch = absX > SWIPE_THRESHOLD;

    if (onSwipeEnd) {
      onSwipeEnd(shouldSwitch, direction);
    }

    touchStart.current = null;
    isLocked.current = null;
  };

  return (
    <div 
        onTouchStart={handleTouchStart} 
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={className}
    >
      {children}
    </div>
  );
};
