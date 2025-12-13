import React, { useRef, TouchEvent } from 'react';

interface DaySwipeLayerProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * A gesture wrapper that detects horizontal swipes to switch days.
 * 
 * Features:
 * - Direction Locking: Distinguishes between vertical scroll and horizontal swipe.
 * - Conflict Avoidance: Ignores swipes on internal horizontally scrollable elements (e.g., Carousels).
 * - Input Safety: Ignores swipes when keyboard is likely active.
 */
export const DaySwipeLayer: React.FC<DaySwipeLayerProps> = ({ 
  onSwipeLeft, 
  onSwipeRight, 
  children,
  className = '', 
  disabled = false 
}) => {
  const touchStart = useRef<{ x: number, y: number } | null>(null);

  // Gesture Configuration
  const MIN_SWIPE_DISTANCE = 50; // Minimum px to count as a swipe
  const MAX_VERTICAL_VARIANCE = 50; // Max vertical drift allowed during a horizontal swipe
  
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    // 1. Ignore if text input is active (keyboard likely visible)
    const activeEl = document.activeElement as HTMLElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
    }

    // 2. Ignore if interacting with horizontal scroll containers
    // We traverse up from target to currentTarget to find any element with 'overflow-x-auto'
    let el = e.target as HTMLElement | null;
    let isInternalScroll = false;
    
    while (el && el !== e.currentTarget) {
        // Check for specific Tailwind class used in this project for scrollables
        if (el.classList.contains('overflow-x-auto')) {
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
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current || disabled) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };

    const diffX = touchStart.current.x - touchEnd.x; // Positive = Swipe Left (Finger moves left)
    const diffY = touchStart.current.y - touchEnd.y;
    
    // Reset immediately to avoid stale state
    touchStart.current = null;

    // Logic:
    // 1. Primary Axis Check: X distance must be significantly larger than Y
    // 2. Threshold Check: X distance must be > MIN_SWIPE_DISTANCE
    // 3. Vertical Constraint: Y distance must be < MAX_VERTICAL_VARIANCE (prevent triggering during sloppy scroll)
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > MIN_SWIPE_DISTANCE && Math.abs(diffY) < MAX_VERTICAL_VARIANCE) {
            if (diffX > 0) {
                // Finger moved left -> Content moves left -> Show Next Day
                onSwipeLeft();
            } else {
                // Finger moved right -> Content moves right -> Show Prev Day
                onSwipeRight();
            }
        }
    }
  };

  return (
    <div 
        onTouchStart={handleTouchStart} 
        onTouchEnd={handleTouchEnd}
        className={className}
    >
      {children}
    </div>
  );
};