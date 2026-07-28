import { endOfMonth, format, startOfMonth, subDays, subMonths } from "date-fns";

export type DatePreset =
  | "all_time"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "custom";

export const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: "all_time", label: "All time" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3_months", label: "Last 3 months" },
  { value: "last_6_months", label: "Last 6 months" },
  { value: "custom", label: "Custom range" },
];

const DATE_FMT = "yyyy-MM-dd";

export function getDateRangeForPreset(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  const to = format(today, DATE_FMT);

  switch (preset) {
    case "all_time":
      return { from: "", to: "" };
    case "last_7_days":
      return { from: format(subDays(today, 6), DATE_FMT), to };
    case "last_30_days":
      return { from: format(subDays(today, 29), DATE_FMT), to };
    case "this_month":
      return { from: format(startOfMonth(today), DATE_FMT), to };
    case "last_month": {
      const prev = subMonths(today, 1);
      return {
        from: format(startOfMonth(prev), DATE_FMT),
        to: format(endOfMonth(prev), DATE_FMT),
      };
    }
    case "last_3_months":
      return { from: format(subMonths(today, 3), DATE_FMT), to };
    case "last_6_months":
      return { from: format(subMonths(today, 6), DATE_FMT), to };
    case "custom":
    default:
      return { from: "", to: "" };
  }
}

export function detectPreset(from: string, to: string): DatePreset {
  for (const { value } of DATE_PRESET_OPTIONS) {
    if (value === "custom") continue;
    const range = getDateRangeForPreset(value);
    if (range.from === from && range.to === to) return value;
  }
  return "custom";
}
