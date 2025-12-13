import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
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
  const [currentValue, setCurrentValue] = useState(initialValue);
  const [mode, setMode] = useState<'wheel' | 'manual'>('wheel');
  const [manualInputValue, setManualInputValue] = useState('');
  
  // Wheel State
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitializing = useRef(true);
  const scrollTimeout = useRef<number | null>(null);
  
  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentValue(initialValue);
      setMode('wheel');
      setManualInputValue('');
      isInitializing.current = true;
    }
  }, [isOpen, initialValue]);

  // Sync manual input when switching modes
  useEffect(() => {
    if (mode === 'manual') {
      setManualInputValue(currentValue.toString());
    }
  }, [mode, currentValue]);

  // --- WHEEL LOGIC ---
  const totalSteps = Math.floor((max - min) / step) + 1;
  
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    
    // Ignore scroll events during initialization to prevent jumpiness or zero-reset
    if (isInitializing.current) return;
    
    // Calculate index from scroll position
    const scrollTop = scrollRef.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const newValue = min + (index * step);
    
    // Clamp
    const clamped = Math.max(min, Math.min(max, newValue));
    
    // Only update state if changed to prevent thrashing
    if (clamped !== currentValue) {
        setCurrentValue(clamped);
    }
  }, [min, max, step, currentValue]);

  // Initial Scroll Position - Synchronous Layout Effect
  useLayoutEffect(() => {
    if (isOpen && mode === 'wheel' && scrollRef.current) {
         // Calculate exact position for initial value
         const index = Math.round((initialValue - min) / step);
         const targetScrollTop = index * ITEM_HEIGHT;
         
         // Apply immediately before paint
         scrollRef.current.scrollTop = targetScrollTop;
         
         // Clear init flag after layout settles
         if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
         scrollTimeout.current = window.setTimeout(() => {
             isInitializing.current = false;
         }, 150);
    }
    return () => {
         if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [isOpen, mode, initialValue, min, step]);

  // Virtualization & 3D Rendering Helper
  const renderWheelItems = () => {
    const windowSize = 40; 
    const currentIndex = Math.round((currentValue - min) / step);
    
    const startIndex = Math.max(0, currentIndex - windowSize);
    const endIndex = Math.min(totalSteps - 1, currentIndex + windowSize);
    
    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
        const itemVal = min + (i * step);
        const offset = i * ITEM_HEIGHT;
        const isSelected = i === currentIndex;
        
        // Distance from visual center
        const distance = (i - currentIndex);
        
        // 3D & Visual Curves
        const angle = distance * 20; 
        const opacity = Math.max(0.1, 1 - Math.pow(Math.abs(distance) * 0.25, 2));
        const scale = isSelected ? 1.1 : Math.max(0.85, 1 - Math.abs(distance) * 0.05);

        // Z-Index: Center items on top, but below overlay (overlay is z-150)
        const zIndex = 100 - Math.abs(distance);

        items.push(
            <div
                key={i}
                className="absolute left-0 right-0 flex items-center justify-center transition-none will-change-transform"
                style={{
                    height: `${ITEM_HEIGHT}px`,
                    top: `${offset}px`,
                    opacity: opacity,
                    zIndex: zIndex,
                    transform: `rotateX(${-angle}deg) scale(${scale}) translateZ(0)`,
                    color: isSelected ? '#111827' : '#6B7280',
                    fontWeight: isSelected ? 700 : 500,
                    WebkitFontSmoothing: 'antialiased',
                    backfaceVisibility: 'hidden'
                }}
            >
                <span className="text-xl tracking-tight tabular-nums">{itemVal}</span>
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
          setCurrentValue(val);
      }
      setMode('wheel');
  };

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
                <div className="relative h-[260px] w-full select-none overflow-hidden">
                    
                    {/* Visual Mask for Organic Fading - Z-index boosted to cover items */}
                    <div className="absolute inset-0 pointer-events-none z-[150] bg-gradient-to-b from-white via-transparent to-white opacity-90" 
                         style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 40%, transparent 60%, black 100%)' }} />

                    {/* Center Highlight Indicator */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[44px] bg-gray-100/50 rounded-lg z-0 opacity-0" />

                    {/* Wheel Container */}
                    <div 
                        ref={scrollRef}
                        className="absolute inset-0 overflow-y-auto no-scrollbar perspective-container"
                        onScroll={handleScroll}
                        style={{ 
                            scrollSnapType: 'y mandatory',
                            scrollBehavior: 'auto',
                            WebkitOverflowScrolling: 'touch',
                            perspective: '1000px',
                            perspectiveOrigin: 'center center'
                        }}
                    >
                        {/* Top Spacer */}
                        <div style={{ height: `${ITEM_HEIGHT * 2.5}px` }} />
                        
                        {/* Scroll Content */}
                        <div className="relative transform-style-3d" style={{ height: `${totalSteps * ITEM_HEIGHT}px` }}>
                             {renderWheelItems()}
                        </div>

                        {/* Bottom Spacer */}
                        <div style={{ height: `${ITEM_HEIGHT * 2.5}px` }} />
                    </div>

                    {/* Tap Center to Edit */}
                    <div 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[200px] h-[50px] z-[200] cursor-pointer"
                        onClick={() => setMode('manual')}
                    />
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
                                placeholder={currentValue.toString()}
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
                onClick={() => {
                    if (mode === 'manual') handleManualSave();
                    onConfirm(currentValue);
                    onClose();
                }}
            >
                Confirm {unit ? `${currentValue}${unit}` : currentValue}
            </Button>
        </div>

      </div>
    </>
  );
};
