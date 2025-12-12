import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  unit?: string;
  icon?: React.ReactNode;
  variant?: 'standalone' | 'inline';
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  className = '',
  variant = 'standalone',
  unit,
  icon,
  error,
  ...props
}, ref) => {
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    props.onFocus?.(e);
  };

  if (variant === 'inline') {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <input
          ref={ref}
          {...props}
          onFocus={handleFocus}
          className={`
            w-full bg-transparent text-center font-bold text-gray-900 
            outline-none rounded-lg px-1 py-0.5 transition-all
            focus:bg-blue-50 focus:text-blue-700 focus:ring-2 focus:ring-blue-500/20
            placeholder-gray-300
            ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        {unit && (
          <span className="text-xs font-bold text-gray-400 ml-1 pointer-events-none select-none">
            {unit}
          </span>
        )}
      </div>
    );
  }

  // Standalone
  return (
    <div className={`
      group flex items-center bg-gray-50 rounded-xl px-4 h-14 transition-all duration-200
      focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20
      ${error ? 'bg-red-50 focus-within:ring-red-500/20' : ''}
      ${props.disabled ? 'opacity-60 cursor-not-allowed' : ''}
      ${className}
    `}>
      {icon && (
        <span className={`mr-3 flex-shrink-0 transition-colors ${error ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`}>
          {icon}
        </span>
      )}
      <input
        ref={ref}
        {...props}
        onFocus={handleFocus}
        className={`
          flex-1 w-full bg-transparent outline-none 
          text-lg font-semibold text-gray-900 placeholder-gray-400
          disabled:cursor-not-allowed
        `}
      />
      {unit && (
        <span className="ml-2 text-sm font-bold text-gray-400 select-none flex-shrink-0">
          {unit}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
