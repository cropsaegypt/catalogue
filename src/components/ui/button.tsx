import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 active:bg-emerald-900',
        whatsapp:
          'bg-[#25D366] text-white shadow-md hover:bg-[#20ba59] active:bg-[#1caa52] font-black tracking-wide',
        destructive:
          'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800',
        outline:
          'border-2 border-emerald-200 bg-white text-emerald-900 shadow-xs hover:bg-emerald-50 hover:border-emerald-400',
        secondary:
          'bg-emerald-50 text-emerald-900 border border-emerald-100 hover:bg-emerald-100',
        ghost:
          'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
        link:
          'text-emerald-700 underline-offset-4 hover:underline font-bold',
        accent:
          'bg-amber-500 text-white shadow-sm hover:bg-amber-600 font-black',
        dark:
          'bg-[#2D2D24] text-white hover:bg-[#3D3D32]',
      },
      size: {
        default: 'h-11 px-4 py-2 text-sm',
        sm: 'h-9 px-3 text-xs rounded-lg',
        lg: 'h-12 px-6 text-base rounded-2xl',
        xl: 'h-14 px-8 text-lg rounded-2xl shadow-md', // Ideal for farmer touch targets
        icon: 'h-10 w-10 p-0 rounded-xl',
        'icon-sm': 'h-8 w-8 p-0 rounded-lg',
        'icon-lg': 'h-12 w-12 p-0 rounded-2xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
