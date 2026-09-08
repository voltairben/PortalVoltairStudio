import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, id, className, ...props }, ref) => {
    const generatedId = React.useId();
    const fieldId = id ?? generatedId;
    return (
      <div className="space-y-1.5">
        <label
          htmlFor={fieldId}
          className="block text-xs font-medium uppercase tracking-wide text-ink-subtle"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={cn(
            "h-11 w-full rounded-lg border border-line-strong bg-surface-1 px-3.5 text-sm text-ink",
            "placeholder:text-ink-subtle",
            "transition-colors duration-150",
            "focus:border-brand-persimmon focus:outline-none focus:ring-2 focus:ring-brand-persimmon/30",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
TextField.displayName = "TextField";
