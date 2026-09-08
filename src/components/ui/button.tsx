import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost";

const base =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium " +
  "transition-[background-color,border-color,color,opacity] duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-persimmon " +
  "disabled:pointer-events-none disabled:opacity-55";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-persimmon text-brand-persimmon-fg hover:bg-brand-persimmon-bright " +
    "shadow-[0_0_0_1px_rgba(255,79,0,0.35),0_8px_30px_-8px_rgba(255,79,0,0.5)]",
  outline:
    "border border-line-strong text-ink hover:border-brand-persimmon hover:text-brand-persimmon",
  ghost: "text-ink-muted hover:text-ink hover:bg-surface-2",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], className)}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
