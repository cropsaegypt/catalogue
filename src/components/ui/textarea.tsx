import * as React from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[90px] w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-900 transition-colors placeholder:text-stone-400 focus-visible:outline-none focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50 leading-relaxed',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
