import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

/**
 * Standard Design System Input.
 * Uses surface-500 (#1B1B22), surface-400 (#2A2A33) border, and 150ms transitions.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "w-full h-9 rounded-lg bg-surface-500 border border-surface-400 px-3 text-xs text-text-primary placeholder:text-text-muted transition-colors duration-150 outline-none focus:border-surface-400 focus:ring-1 focus:ring-surface-400 disabled:opacity-50 disabled:cursor-not-allowed",
          error && "border-accent focus:border-accent focus:ring-accent",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export default Input;
