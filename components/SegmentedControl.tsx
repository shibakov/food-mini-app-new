import React from 'react';

export interface SegmentOption<T extends string | number> {
  label: string;
  value: T;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export const SegmentedControl = <T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
}: SegmentedControlProps<T>) => {
  return (
    <div className={`bg-gray-100 p-1 rounded-xl flex gap-1 select-none ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={String(option.value)}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            type="button"
            className={`
              flex-1 py-1.5 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all duration-200
              ${isActive 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'bg-transparent text-gray-500 hover:text-gray-700 active:bg-gray-200/50'
              }
            `}
          >
            {option.icon && (
              <span className={`flex-shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                {option.icon}
              </span>
            )}
            <span className="truncate tracking-wide uppercase text-[10px] sm:text-xs">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
