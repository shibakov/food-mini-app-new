import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'dashed' | 'ghost' | 'danger';
  size?: 'default' | 'sm' | 'icon';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'default',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  // Base: Flex center, Radius M (rounded-2xl), Interaction physics, No text selection
  const baseStyles = "relative flex items-center justify-center font-bold transition-all active:scale-[0.98] disabled:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed select-none";
  
  // Sizes
  const sizeStyles = {
    default: "h-14 px-6 text-lg rounded-2xl",
    sm: "h-9 px-4 text-xs rounded-xl",
    icon: "w-10 h-10 rounded-xl",
  }[size];

  const variants = {
    // Primary: Dominant, Calm Blue, White Text
    primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
    
    // Secondary: Surface, Subtle Border, Neutral Text
    secondary: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 active:bg-gray-100",
    
    // Dashed: Additive Actions, Low Visual Weight
    dashed: "bg-transparent text-gray-500 border border-dashed border-gray-300 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400 active:bg-gray-100",
    
    // Ghost: Transparent, Interactive Text
    ghost: "bg-transparent text-blue-600 hover:bg-blue-50 active:bg-blue-100/50",

    // Danger: Destructive Actions
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100 active:bg-rose-200"
  };

  return (
    <button 
      className={`${baseStyles} ${sizeStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 16 : 24} />
      ) : (
        <>
          {icon && <span className={children ? "mr-2" : ""}>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};