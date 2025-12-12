import React from 'react';

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'regular' | 'compact' | 'dense';
  className?: string;
  disabled?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  onClick,
  variant = 'regular',
  className = '',
  disabled = false,
}) => {
  // Padding variants
  const paddingClass = {
    regular: 'p-5',
    compact: 'p-4',
    dense: 'p-3',
  }[variant];

  // Base styles: Surface (white), Radius M (rounded-2xl), Subtle Shadow, No Border
  const baseClasses = 'bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)]';

  // Interaction styles
  const interactiveClasses = onClick && !disabled
    ? 'cursor-pointer transition-all duration-200 active:scale-[0.99] active:shadow-none'
    : '';

  // Disabled state
  const disabledClasses = disabled ? 'opacity-60 pointer-events-none' : '';

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`${baseClasses} ${paddingClass} ${interactiveClasses} ${disabledClasses} ${className}`}
    >
      {children}
    </div>
  );
};
