import * as React from 'react';
import { cn } from '../../utils/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-bold transition-all active:scale-95 focus:outline-none disabled:opacity-50 disabled:pointer-events-none rounded-lg";
    
    const variants = {
      primary: "signature-glow text-white shadow-lg shadow-primary/20 hover:opacity-90",
      secondary: "bg-surface-container-high hover:bg-surface-variant text-on-secondary-container",
      outline: "bg-surface-container-lowest border border-outline-variant hover:border-primary text-on-surface",
      ghost: "hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
    };

    const sizes = {
      sm: "px-4 py-2 text-xs",
      md: "h-12 px-6 text-sm", // standard from login page
      lg: "px-8 py-3 text-base"
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <span className="material-symbols-outlined mr-2 animate-spin text-[18px]">progress_activity</span>}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
