import React, { useRef, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  unit,
  disabled = false,
  className = '',
  error = false,
}) => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);

  // Keep ref synced with prop to access latest value in interval closure
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const adjust = (direction: 1 | -1) => {
    const current = valueRef.current;
    let next = current + (step * direction);
    if (next < min) next = min;
    if (next > max) next = max;
    
    onChange(next);
  };

  const handlePointerDown = (direction: 1 | -1) => {
    if (disabled) return;
    
    // 1. Immediate change on tap
    adjust(direction);

    // 2. Setup rapid change after delay (Long Press)
    // Clear any existing timers first just in case
    clearTimers();
    
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        adjust(direction);
      }, 80); // 80ms interval for fast but controllable scrolling
    }, 400); // 400ms delay before auto-repeat starts
  };

  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, []);

  return (
    <div className={`
      flex items-center justify-between bg-gray-50 rounded-2xl p-1 h-14 select-none touch-manipulation
      ${error ? 'ring-2 ring-rose-100 bg-rose-50' : 'focus-within:ring-2 focus-within:ring-blue-100'}
      ${disabled ? 'opacity-50 pointer-events-none' : ''}
      ${className}
    `}>
      {/* Decrement Button */}
      <button
        type="button"
        onPointerDown={() => handlePointerDown(-1)}
        onPointerUp={clearTimers}
        onPointerLeave={clearTimers}
        onContextMenu={(e) => e.preventDefault()}
        className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-200 text-gray-600 active:scale-90 active:border-blue-200 active:text-blue-600 transition-all"
      >
        <Minus size={20} strokeWidth={2.5} />
      </button>

      {/* Value Display */}
      <div className="flex-1 text-center flex flex-col items-center justify-center overflow-hidden px-2">
        <div className={`text-lg font-bold tabular-nums tracking-tight leading-none ${error ? 'text-rose-600' : 'text-gray-900'}`}>
          {value}
        </div>
        {unit && (
          <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${error ? 'text-rose-400' : 'text-gray-400'}`}>
            {unit}
          </div>
        )}
      </div>

      {/* Increment Button */}
      <button
        type="button"
        onPointerDown={() => handlePointerDown(1)}
        onPointerUp={clearTimers}
        onPointerLeave={clearTimers}
        onContextMenu={(e) => e.preventDefault()}
        className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-200 text-gray-600 active:scale-90 active:border-blue-200 active:text-blue-600 transition-all"
      >
        <Plus size={20} strokeWidth={2.5} />
      </button>
    </div>
  );
};