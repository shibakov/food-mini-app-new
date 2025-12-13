import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { Keyboard, X } from 'lucide-react';
import { Button } from './Button';

interface UniversalPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: number) => void;
  title: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

const ITEM_HEIGHT = 50;

// -- PHYSICS CONSTANTS --
const FRICTION = 0.94;             // Base inertia (Heavy feel)
const SNAP_THRESHOLD = 4.0;        // Velocity (px/frame) below which snapping engages (approx 240px/s)
const SNAP_STRENGTH = 0.06;        // Gentle spring force for "Soft Landing"
const SNAP_DAMPING = 0.92;         // Extra damping during snap (Multiplies with FRICTION)
const BOUNDS_SNAP_STRENGTH = 0.2;  // Strong spring for rubber-banding
const BOUNDS_DAMPING = 0.6;        // Heavy damping for rubber-banding to prevent oscillation
const STOP_THRESHOLD = 0.1;        // Precision to consider stopped

export const UniversalPicker: React.FC<UniversalPickerProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  value: initialValue,
  min = 0,
  max = 9999,
  step = 1,
  unit = ''
}) => {
  const [mode, setMode] = useState<'wheel' | 'manual'>('wheel');
  const [manualInputValue, setManualInputValue] = useState('');
  
  // -- PHYSICS STATE --
  // We track pixels (y). 0y = min value.
  const [scrollPos, setScrollPos] = useState(0);
  
  // Refs for loop
  const physics = useRef({
    y: 0,
    v: 0,
    isDragging: false,
    lastY: 0,
    lastT: 0
  });
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Constants derived from props
  const totalSteps = Math.floor((max - min) / step) + 1;
  const maxScroll = (totalSteps - 1) * ITEM_HEIGHT;

  // Initialize
  useLayoutEffect(() => {
    if (isOpen) {
      const startPos = ((initialValue - min) / step) * ITEM_HEIGHT;
      setScrollPos(startPos);
      physics.current = {
        y: startPos,
        v: 0,
        isDragging: false,
        lastY: 0,
        lastT: 0
      };
      setMode('wheel');
      setManualInputValue('');
    }
  }, [isOpen, initialValue, min, step]);

  // Sync manual input
  useEffect(() => {
    if (mode === 'manual') {
       // Calculate current integer value from float scrollPos
       const idx = Math.round(physics.current.y / ITEM_HEIGHT);
       const val = min + (idx * step);
       const clamped = Math.max(min, Math.min(max, val));
       setManualInputValue(clamped.toString());
    }
  }, [mode]);

  // --- PHYSICS LOOP ---
  useEffect(() => {
    if (!isOpen || mode !== 'wheel') {
        cancelAnimationFrame(rafRef.current);
        return;
    }

    const loop = () => {
        const p = physics.current;
        
        if (!p.isDragging) {
            // 1. Determine Target (Bounds or Snap)
            let target = null;
            let strength = 0;
            let damping = 1;

            if (p.y < 0) {
                target = 0;
                strength = BOUNDS_SNAP_STRENGTH;
                damping = BOUNDS_DAMPING;
            } else if (p.y > maxScroll) {
                target = maxScroll;
                strength = BOUNDS_SNAP_STRENGTH;
                damping = BOUNDS_DAMPING;
            } else if (Math.abs(p.v) < SNAP_THRESHOLD) {
                // In-bounds "Soft Landing"
                // Engage magnetic snap when velocity is low
                const nearest = Math.round(p.y / ITEM_HEIGHT) * ITEM_HEIGHT;
                target = nearest;
                strength = SNAP_STRENGTH;
                damping = SNAP_DAMPING;
            }

            // 2. Apply Forces
            if (target !== null) {
                const dist = target - p.y;
                
                // Stop condition
                if (Math.abs(dist) < STOP_THRESHOLD && Math.abs(p.v) < STOP_THRESHOLD) {
                    p.y = target;
                    p.v = 0;
                } else {
                    // Spring Physics: F = -kx
                    // We apply force to velocity, then damp
                    p.v += dist * strength;
                    
                    // Special damping logic:
                    // If bounding, we override friction significantly.
                    // If snapping, we gently increase damping on top of base friction.
                    if (strength === BOUNDS_SNAP_STRENGTH) {
                        p.v *= damping;
                    } else {
                        p.v *= FRICTION * damping; 
                    }
                }
            } else {
                // Free Inertia
                p.v *= FRICTION;
            }

            // 3. Update Position
            p.y += p.v;

            // 4. Render
            // Only update state if moved significantly to reduce react overhead
            setScrollPos(prev => {
                if (Math.abs(prev - p.y) < 0.1) return prev;
                return p.y;
            });
        }
        
        rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isOpen, mode, maxScroll]);

  // --- TOUCH HANDLERS ---
  const handleTouchStart = (e: React.TouchEvent) => {
    const p = physics.current;
    p.isDragging = true;
    p.v = 0; // Stop inertia
    p.lastY = e.touches[0].clientY;
    p.lastT = Date.now();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const p = physics.current;
    if (!p.isDragging) return;
    
    // STRICT AXIS LOCK: We ignore clientX completely.
    const clientY = e.touches[0].clientY;
    const dy = clientY - p.lastY; 
    
    // Apply delta to position (Inverted: Drag up = Scroll down/increase y)
    // Resistance at bounds (rubber band)
    if (p.y < 0 || p.y > maxScroll) {
        p.y -= dy * 0.4; // 60% resistance
    } else {
        p.y -= dy; // 1:1 movement
    }

    // Velocity tracking
    p.v = -dy; 

    p.lastY = clientY;
    p.lastT = Date.now();
    
    setScrollPos(p.y);
  };

  const handleTouchEnd = () => {
    physics.current.isDragging = false;
  };

  // --- RENDER HELPERS ---
  const renderWheelItems = () => {
    // Current Float Index based on Physics
    const currentIndex = scrollPos / ITEM_HEIGHT;
    
    // Windowing for performance
    const renderWindow = 12; // +/- items to render
    const centerIdxInt = Math.round(currentIndex);
    const startIdx = Math.max(0, centerIdxInt - renderWindow);
    const endIdx = Math.min(totalSteps - 1, centerIdxInt + renderWindow);

    const items = [];
    for (let i = startIdx; i <= endIdx; i++) {
        const itemVal = min + (i * step);
        // Distance from the exact center line (float)
        const distance = i - currentIndex;
        
        // 3D Transform Logic
        const angle = distance * 18;
        const offset = distance * ITEM_HEIGHT;

        // Visual Weight
        const absDist = Math.abs(distance);
        const opacity = Math.max(0.15, 1 - Math.pow(absDist * 0.3, 2));
        const scale = Math.max(0.8, 1 - Math.pow(absDist * 0.1, 2)); 
        const zIndex = 100 - Math.round(absDist);

        items.push(
            <div
                key={i}
                className="absolute left-0 right-0 h-[50px] flex items-center justify-center will-change-transform"
                style={{
                    top: '50%', // Centered
                    marginTop: '-25px', // Half height offset
                    opacity,
                    zIndex,
                    transform: `translateY(${offset}px) rotateX(${-angle}deg) scale(${scale}) translateZ(0)`,
                    color: Math.abs(distance) < 0.5 ? '#111827' : '#6B7280',
                    fontWeight: Math.abs(distance) < 0.5 ? 700 : 500,
                    backfaceVisibility: 'hidden',
                    WebkitFontSmoothing: 'antialiased',
                }}
            >
               <span className="text-xl tracking-tight tabular-nums">{itemVal}</span>
               {/* Always show unit to prevent layout shift */}
               {unit && <span className="text-xs font-bold text-gray-400 ml-1 mt-1">{unit}</span>}
            </div>
        );
    }
    return items;
  };

  const handleManualSave = () => {
      let parsed = parseInt(manualInputValue);
      if (!isNaN(parsed)) {
          const stepped = Math.round((parsed - min) / step) * step + min;
          let val = Math.max(min, Math.min(max, stepped));
          // Update physics to jump to new value
          const newPos = ((val - min) / step) * ITEM_HEIGHT;
          physics.current.y = newPos;
          physics.current.v = 0;
          setScrollPos(newPos);
      }
      setMode('wheel');
  };

  const confirmValue = () => {
      if (mode === 'manual') handleManualSave();
      
      const idx = Math.round(physics.current.y / ITEM_HEIGHT);
      const val = min + (idx * step);
      const clamped = Math.max(min, Math.min(max, val));
      
      onConfirm(clamped);
      onClose();
  };

  const derivedCurrentValue = Math.max(min, Math.min(max, min + (Math.round(scrollPos / ITEM_HEIGHT) * step)));

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60]" onClick={onClose} />
      
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-[2rem] shadow-2xl flex flex-col pb-safe max-h-[90vh] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors">
                <X size={22} />
            </button>
            <div className="flex flex-col items-center">
                 <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{title}</span>
            </div>
            {mode === 'manual' ? (
                 <button onClick={handleManualSave} className="px-4 py-1.5 -mr-2 text-white bg-gray-900 font-bold rounded-full transition-colors text-sm shadow-sm active:scale-95">
                    Done
                </button>
            ) : (
                <button 
                    onClick={() => setMode('manual')}
                    className="p-2 -mr-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-colors"
                >
                    <Keyboard size={22} />
                </button>
            )}
        </div>

        {/* Content */}
        <div className="w-full relative bg-white">
            {mode === 'wheel' ? (
                <div 
                    className="relative h-[260px] w-full select-none overflow-hidden cursor-grab active:cursor-grabbing"
                    style={{ touchAction: 'none' }} 
                    ref={containerRef}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    // Mouse support for desktop testing
                    onMouseDown={(e) => {
                        const p = physics.current;
                        p.isDragging = true;
                        p.v = 0;
                        p.lastY = e.clientY;
                    }}
                    onMouseMove={(e) => {
                        if (physics.current.isDragging) {
                            const p = physics.current;
                            const dy = e.clientY - p.lastY;
                            p.y -= dy;
                            p.v = -dy;
                            p.lastY = e.clientY;
                            setScrollPos(p.y);
                        }
                    }}
                    onMouseUp={() => { physics.current.isDragging = false; }}
                    onMouseLeave={() => { physics.current.isDragging = false; }}
                >
                    
                    {/* Visual Mask */}
                    <div className="absolute inset-0 pointer-events-none z-[150] bg-gradient-to-b from-white via-transparent to-white opacity-90" 
                         style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 40%, transparent 60%, black 100%)' }} />

                    {/* Center Highlight Indicator */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[44px] bg-gray-100/50 rounded-lg z-0 opacity-0" />

                    {/* 3D Container */}
                    <div 
                        className="absolute inset-0 perspective-container flex items-center justify-center"
                        style={{ perspective: '1000px', perspectiveOrigin: 'center center' }}
                    >
                         <div className="relative w-full h-full transform-style-3d">
                             {renderWheelItems()}
                         </div>
                    </div>
                </div>
            ) : (
                <div className="h-[260px] flex flex-col items-center justify-center p-6 bg-gray-50/30">
                    <div className="w-full max-w-[180px] animate-[fadeIn_0.2s_ease-out]">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block text-center">Enter Value</label>
                        <div className="flex items-center bg-white border border-gray-200 rounded-2xl px-4 h-16 shadow-sm focus-within:ring-4 ring-gray-100 transition-all">
                             <input
                                autoFocus
                                type="number" 
                                pattern="\d*"
                                value={manualInputValue}
                                onChange={e => setManualInputValue(e.target.value)}
                                className="w-full text-center text-3xl font-bold text-gray-900 outline-none bg-transparent placeholder-gray-200"
                                placeholder={derivedCurrentValue.toString()}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleManualSave(); }}
                            />
                        </div>
                        {unit && <div className="text-center mt-3 text-sm font-bold text-gray-400">{unit}</div>}
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 pb-safe border-t border-gray-100 bg-white">
             <Button 
                variant="primary" 
                className="w-full shadow-lg shadow-gray-200/50"
                onClick={confirmValue}
            >
                Confirm {unit ? `${derivedCurrentValue}${unit}` : derivedCurrentValue}
            </Button>
        </div>

      </div>
    </>
  );
};
