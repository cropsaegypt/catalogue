import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black transition-colors focus:outline-hidden',
  {
    variants: {
      variant: {
        default:
          'bg-emerald-100 text-emerald-900 border border-emerald-200',
        secondary:
          'bg-stone-100 text-stone-800 border border-stone-200',
        destructive:
          'bg-rose-100 text-rose-800 border border-rose-200',
        outline:
          'text-stone-700 border border-stone-300 bg-white',
        success:
          'bg-emerald-600 text-white shadow-2xs',
        fertilizer:
          'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold',
        pesticide:
          'bg-rose-50 text-rose-800 border border-rose-300 font-bold',
        stimulant:
          'bg-amber-50 text-amber-900 border border-amber-300 font-bold',
        whatsapp:
          'bg-[#25D366]/15 text-[#075E54] border border-[#25D366]/40 font-black',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  className?: string;
  children?: React.ReactNode;
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
