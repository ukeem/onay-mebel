"use client";

import { Input } from "@/components/ui/input";
import { cn, selectOnFocus } from "@/lib/utils";
import * as React from "react";

/**
 * Numeric input that:
 * - Accepts both comma and dot as decimal separator
 * - Displays comma as decimal separator
 * - Allows clearing the field (empty = 0 for calculations)
 * - On blur, normalizes the display value
 */
export interface NumInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> {
  value: number | string;
  onValueChange: (num: number) => void;
  /** If true, value=0 shows as empty (e.g. for optional fields). Default false */
  zeroAsEmpty?: boolean;
}

export const NumInput = React.forwardRef<HTMLInputElement, NumInputProps>(
  (
    { value, onValueChange, zeroAsEmpty = false, className, onFocus, ...props },
    ref,
  ) => {
    const [localStr, setLocalStr] = React.useState<string | null>(null);
    const editing = localStr !== null;

    // Display value: while editing show local string, otherwise format the number
    const displayValue = editing ? localStr : formatDisplay(value, zeroAsEmpty);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Allow empty
      if (raw === "") {
        setLocalStr("");
        onValueChange(0);
        return;
      }

      // Normalize: replace dots with commas, allow digits + comma + minus
      let s = raw.replace(/\./g, ",");
      s = s.replace(/[^\d,\-]/g, "");

      // Only one comma
      const parts = s.split(",");
      if (parts.length > 2) {
        s = parts[0] + "," + parts.slice(1).join("");
      }

      // Only leading minus
      const minusCount = (s.match(/-/g) || []).length;
      if (minusCount > 1 || (minusCount === 1 && s[0] !== "-")) {
        s = s.replace(/-/g, "");
      }

      setLocalStr(s);

      // Parse for calculation
      const num = Number(s.replace(",", "."));
      if (!isNaN(num)) {
        onValueChange(num);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setLocalStr(null); // exit editing mode, show formatted value
      props.onBlur?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Enter editing mode with current display value
      setLocalStr(formatDisplay(value, zeroAsEmpty));
      if (onFocus) {
        onFocus(e);
      } else {
        selectOnFocus(e);
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        className={cn(className)}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        {...props}
      />
    );
  },
);
NumInput.displayName = "NumInput";

function formatDisplay(val: number | string, zeroAsEmpty: boolean): string {
  if (val === "" || val === null || val === undefined) return "";
  const n = typeof val === "number" ? val : Number(val);
  if (zeroAsEmpty && n === 0) return "";
  // Avoid floating point artifacts: round to 4 decimals
  const rounded = Math.round(n * 10000) / 10000;
  return String(rounded).replace(".", ",");
}
