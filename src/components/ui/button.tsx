import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Standard Design System Button aligned with GEMINI.md Section 9.
 * Brand glow applies strictly on primary button hover.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-medium transition-colors duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F7F8] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'cf-btn-primary border border-transparent text-white',
        secondary:
          'bg-[#1B1B22] hover:bg-[#22222B] text-[#F7F7F8] border border-[#2A2A33]',
        blue:
          'bg-[#1B1B22] hover:bg-[#22222B] text-[#F7F7F8] border border-[#2A2A33]',
        outline:
          'border border-[#2A2A33] bg-[#131318] hover:bg-[#1B1B22] text-[#F7F7F8]',
        ghost:
          'bg-transparent text-[#A1A1AA] hover:text-[#F7F7F8] hover:bg-[#1B1B22] border border-transparent',
        destructive:
          'bg-transparent text-[#A1A1AA] hover:text-[#F0607A] hover:bg-[#1B1B22] border border-transparent',
        icon:
          'p-1.5 text-[#A1A1AA] hover:text-[#F7F7F8] hover:bg-[#1B1B22] rounded-lg border border-transparent shrink-0',
        default: 'cf-btn-primary border border-transparent text-white',
      },
      size: {
        default: 'h-9 px-3.5 py-2',
        sm: 'h-8 px-2.5 py-1.5 text-xs',
        lg: 'h-10 px-5 py-2.5 text-sm',
        icon: 'h-8 w-8 p-1.5',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default',
    },
  },
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
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
export default Button;
