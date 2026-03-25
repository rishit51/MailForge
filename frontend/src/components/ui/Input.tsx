import * as React from 'react';
import { cn } from '../../utils/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-on-surface-variant ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full h-12 bg-surface-container-highest border-none rounded-lg text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all outline-none",
              leftIcon && "pl-10",
              !leftIcon && "px-4",
              error && "ring-2 ring-error/50",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-[10px] font-bold text-error ml-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
