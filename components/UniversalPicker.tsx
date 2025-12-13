import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Check, Keyboard, Delete, X, ChevronDown } from 'lucide-react';
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
const VISIBLE_ROWS = 5; // Must be odd
const MIDDLE_INDEX = Math.floor(VISIBLE_ROWS / 2);

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
  const isDragging = useRef(false);
  
  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentValue(initialValue);
      setMode('wheel');
      setManualInputValue('');
    }
  }, [isOpen, initialValue]);

  // Sync manual input when switching modes
  useEffect(() => {
    if (mode === 'manual') {
      setManualInputValue(currentValue.toString());
    } else {
        // When switching back to wheel, ensure we snap effectively
        // The scroll layout effect handles the visual snap
    }
  }, [mode, currentValue]);

  // --- WHEEL LOGIC ---
  
  // Generate range info
  const totalSteps = Math.floor((max - min) / step) + 1;
  
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const scrollTop = scrollRef.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const newValue = min + (index * step);
    
    // Clamp
    const clamped = Math.max(min, Math.min(max, newValue));
    if (clamped !== currentValue) {
        setCurrentValue(clamped);
    }
  }, [min, max, step, currentValue]);

  // Initial Scroll Position & Snap
  useEffect(() => {
    if (isOpen && mode === 'wheel' && scrollRef.current) {
        const index = Math.round((currentValue - min) / step);
        scrollRef.current.scrollTop = index * ITEM_HEIGHT;
    }
  }, [isOpen, mode, min, step]); // Intentionally omitting currentValue to avoid loops

  // Virtualization Helper
  const renderWheelItems = () => {
    // We only render items around the current value to keep DOM light
    // Window size: +/- 20 items is usually enough for smooth visual, 
    // but for fast scrolling we might need more.
    // CSS-based virtualization using absolute positioning in a tall container is robust.
    
    const currentIndex = Math.floor((currentValue - min) / step);
    const windowSize = 30; // Render range
    const startIndex = Math.max(0, currentIndex - windowSize);
    const endIndex = Math.min(totalSteps - 1, currentIndex + windowSize);
    
    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
        const itemVal = min + (i * step);
        const offset = i * ITEM_HEIGHT;
        const isSelected = i === currentIndex;
        
        // Calculate distance for styling
        const distance = Math.abs(i - currentIndex);
        const opacity = Math.max(0.2, 1 - (distance * 0.25));
        const scale = Math.max(0.8, 1 - (distance * 0.05));
        
        items.push(
            <div
                key={i}
                className="absolute left-0 right-0 flex items-center justify-center transition-all duration-75 will-change-transform"
                style={{
                    height: `${ITEM_HEIGHT}px`,
                    top: `${offset}px`,
                    opacity: opacity,
                    transform: `scale(${scale})`,
                    fontWeight: isSelected ? 700 : 400,
                    color: isSelected ? '#111827' : '#9CA3AF'
                }}
            >
                <span className="text-xl tracking-tight">{itemVal}</span>
                {unit && isSelected && <span className="text-xs font-bold text-gray-400 ml-1 mt-1">{unit}</span>}
            </div>
        );
    }
    return items;
  };

  const handleManualSave = () => {
      const parsed = parseInt(manualInputValue);
      if (!isNaN(parsed)) {
          let val = Math.max(min, Math.min(max, parsed));
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
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors">
                <X size={20} />
            </button>
            <div className="flex flex-col items-center">
                 <div className="w-10 h-1 bg-gray-200 rounded-full mb-2" />
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</span>
            </div>
            {mode === 'manual' ? (
                 <button onClick={handleManualSave} className="p-2 text-blue-600 font-bold hover:bg-blue-50 rounded-full transition-colors text-sm">
                    Done
                </button>
            ) : (
                <button 
                    onClick={() => setMode('manual')}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                >
                    <Keyboard size={20} />
                </button>
            )}
        </div>

        {/* Content */}
        <div className="w-full relative">
            {mode === 'wheel' ? (
                <div className="relative h-[250px] w-full bg-white select-none">
                    {/* Gradients */}
                    <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
                    
                    {/* Highlight Bar */}
                    <div className="absolute top-1/2 left-0 right-0 h-[50px] -mt-[25px] bg-gray-50 border-t border-b border-gray-100 z-0" />
                    
                    {/* Wheel Container */}
                    <div 
                        ref={scrollRef}
                        className="absolute inset-0 overflow-y-auto no-scrollbar scroll-smooth snap-y snap-mandatory"
                        onScroll={handleScroll}
                        style={{ scrollSnapType: 'y mandatory' }}
                    >
                        {/* Top Spacer */}
                        <div style={{ height: `${ITEM_HEIGHT * 2}px` }} />
                        
                        {/* Scroll Content (Fixed Height for Scroll Logic) */}
                        <div className="relative" style={{ height: `${totalSteps * ITEM_HEIGHT}px` }}>
                             {renderWheelItems()}
                        </div>

                        {/* Bottom Spacer */}
                        <div style={{ height: `${ITEM_HEIGHT * 2}px` }} />
                    </div>

                    {/* Touch Overlay for "Manual Mode Trigger" on Center Click */}
                    <div 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[200px] h-[50px] z-20 cursor-pointer"
                        onClick={() => setMode('manual')}
                    />
                </div>
            ) : (
                <div className="h-[250px] flex flex-col items-center justify-center p-6 bg-gray-50/50">
                    <div className="w-full max-w-[200px]">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block text-center">Enter Value</label>
                        <div className="flex items-center bg-white border-2 border-blue-500 rounded-2xl px-4 h-16 shadow-sm focus-within:ring-4 ring-blue-500/10 transition-all">
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
                        {unit && <div className="text-center mt-2 text-sm font-bold text-gray-400">{unit}</div>}
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white">
             <Button 
                variant="primary" 
                className="w-full"
                onClick={() => {
                    if (mode === 'manual') handleManualSave();
                    onConfirm(currentValue);
                    onClose();
                }}
            >
                Confirm {unit ? `${currentValue} ${unit}` : currentValue}
            </Button>
        </div>

      </div>
    </>
  );
};
