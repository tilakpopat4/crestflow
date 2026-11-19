import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard Design System Card container.
 * Uses surface-700 (#212121) with crisp 1px surface-400 (#333333) border.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface-700 border border-surface-400 rounded-xl p-4 sm:p-5 shadow-2xs transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn("flex items-center justify-between gap-3 pb-3 border-b border-surface-400/60 mb-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-semibold text-text-primary tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-text-secondary mt-0.5", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export default Card;
