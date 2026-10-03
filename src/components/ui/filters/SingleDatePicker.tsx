"use client";

import { DateInput } from "@/components/ui/date-input";

/**
 * Single-date selector with a clean string API.
 * Thin facade over the shared `DateInput` popover calendar.
 */
export function SingleDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled,
  className,
}: {
  value: string; // YYYY-MM-DD or ""
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <DateInput
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value={value} onChange={(e: any) => onChange(e?.target?.value ?? "")}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
