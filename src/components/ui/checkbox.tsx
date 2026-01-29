"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  indeterminate?: boolean;
}

/**
 * Checkbox component with custom styling.
 * Supports checked, indeterminate, and disabled states.
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, indeterminate, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate ?? false;
      }
    }, [indeterminate]);

    // Merge refs
    React.useImperativeHandle(ref, () => inputRef.current!, []);

    return (
      <div
        className={cn(
          "relative h-4 w-4 flex items-center justify-center",
          className
        )}
      >
        <input
          ref={inputRef}
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 rounded border border-slate-300 transition-colors",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-slate-400 peer-focus-visible:ring-offset-2",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            checked || indeterminate
              ? "border-slate-900 bg-slate-900"
              : "bg-white"
          )}
          onClick={() => {
            if (!props.disabled) {
              onCheckedChange?.(!checked);
            }
          }}
        >
          {(checked || indeterminate) && (
            <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
          )}
        </div>
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
