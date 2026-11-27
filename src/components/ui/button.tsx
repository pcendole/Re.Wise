import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest disabled:pointer-events-none disabled:opacity-50 active:scale-95';
    
    const variantStyles = {
      default: 'bg-forest text-white shadow-xs hover:opacity-90',
      destructive: 'bg-rose-600 text-white shadow-xs hover:bg-rose-700',
      outline: 'border border-theme bg-transparent text-theme-primary hover:bg-card-theme',
      secondary: 'bg-sage text-forest shadow-xs hover:opacity-90',
      ghost: 'hover:bg-card-theme text-theme-secondary hover:text-theme-primary',
      link: 'text-forest underline-offset-4 hover:underline',
    };

    const sizeStyles = {
      default: 'h-11 px-5 py-2.5',
      sm: 'h-9 rounded-lg px-3 text-xs',
      lg: 'h-13 rounded-2xl px-8 text-base font-semibold',
      icon: 'h-10 w-10',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
