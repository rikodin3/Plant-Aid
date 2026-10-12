import * as React from 'react';
import { cn } from '../../lib/utils';

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  elevation?: 'flat' | 'subtle' | 'elevated';
}

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, glass = true, elevation = 'subtle', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl transition-all duration-200',
          glass
            ? 'glass-frost'
            : 'bg-white/90 border border-slate-200/80 shadow-xs',
          elevation === 'elevated' && 'shadow-[0_24px_48px_-12px_rgba(15,87,87,0.14)]',
          elevation === 'flat' && 'shadow-none border-transparent',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Surface.displayName = 'Surface';
