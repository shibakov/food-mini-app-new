import React from 'react';
import { ChevronDown, Edit2 } from 'lucide-react';

interface ValueTriggerProps {
  label?: string;
  value: string | number;
  unit?: string;
  onClick: () => void;
  variant?: 'large' | 'compact' | 'inline';
  disabled?: boolean;
  className?: string;
}

export const ValueTrigger: React.FC<ValueTriggerProps> = ({
  label,
  value,
  unit,
  onClick,
  variant = 'large',
  disabled = false,
  className = ''
}) => {
  if (variant === 'inline') {
    return (
      <button 
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-blue-50 active:text-blue-600 transition-all ${disabled ? 'opacity-50' : ''} ${className}`}
      >
        <span className="text-sm font-bold text-gray-900">{value}</span>
        {unit && <span className="text-xs font-bold text-gray-500">{unit}</span>}
      </button>
    );
  }

  if (variant === 'compact') {
      return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center justify-between w-full bg-gray-50 hover:bg-gray-100 active:bg-gray-200 p-3 rounded-xl transition-all border border-transparent hover:border-gray-200 ${disabled ? 'opacity-50' : ''} ${className}`}
        >
            {label && <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>}
            <div className="flex items-center gap-1">
                <span className="text-base font-bold text-gray-900">{value}</span>
                {unit && <span className="text-xs font-bold text-gray-400">{unit}</span>}
            </div>
        </button>
      );
  }

  // Large (Default)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-full flex items-center justify-between bg-gray-50 p-1 pr-4 pl-5 rounded-2xl h-14
        border border-transparent hover:border-gray-200 active:border-blue-200 active:bg-blue-50/30 transition-all group
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <div className="flex flex-col items-start">
         {label && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 group-hover:text-gray-500 transition-colors">{label}</span>}
         <div className="flex items-baseline gap-1">
             <span className="text-xl font-bold text-gray-900 tabular-nums leading-none">{value}</span>
             {unit && <span className="text-xs font-bold text-gray-400">{unit}</span>}
         </div>
      </div>
      
      <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:border-blue-100 transition-all">
         <Edit2 size={14} />
      </div>
    </button>
  );
};
