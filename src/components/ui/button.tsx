import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Standard Design System Button component.
 * Adheres strictly to project-rules.md palette:
 * - primary: #E1002D accent (max 1 per screen)
 * - secondary: surface-500 with surface-400 border
 * - ghost: transparent with surface-500 hover
 * - destructive: quiet ghost with accent hover
 * - icon: compact icon action trigger
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-medium transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-surface-400 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-accent hover:bg-[#c70027] text-white border-0 shadow-xs",
        secondary:
          "bg-surface-500 hover:bg-surface-400 text-text-primary border-0 shadow-2xs",
        blue:
          "bg-surface-500 hover:bg-surface-400 text-text-primary border-0 shadow-2xs",
        outline:
          "border border-surface-400 bg-surface-700 hover:bg-surface-600 text-text-primary",
        ghost:
          "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-500 border-0",
        destructive:
          "bg-transparent text-text-secondary hover:text-accent hover:bg-surface-500 border-0",
        icon:
          "p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-500 rounded-lg border-0 shrink-0",
        default:
          "bg-accent hover:bg-[#c70027] text-white border-0 shadow-xs",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 px-2.5 py-1.5 text-xs",
        lg: "h-10 px-5 py-2.5 text-sm",
        icon: "h-8 w-8 p-1.5",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
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
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
export default Button;
