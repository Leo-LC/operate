import * as React from "react";
import { cn } from "@/lib/utils";

interface KpiStatProps extends Omit<React.ComponentProps<"article">, "children"> {
  label: string;
  value: string;
  unit?: string;
  /** Comparison line, usually a semantic delta. */
  comparison?: React.ReactNode;
  /** Supporting context under the value. */
  hint?: React.ReactNode;
  /**
   * Semantic color for the value. Omitted keeps the neutral foreground; use it
   * for signed results (profit/loss) rather than for decoration.
   */
  tone?: "positive" | "negative";
}

/**
 * Label → value → comparison → note. No decorative icon: the number carries
 * the hierarchy. Comparison formatting stays with the module.
 */
export function KpiStat({
  label,
  value,
  unit,
  comparison,
  hint,
  tone,
  className,
  ...props
}: KpiStatProps) {
  return (
    <article className={cn("ui-kpi", className)} data-tone={tone} {...props}>
      <h3 className="ui-kpi-label">{label}</h3>
      <div className="ui-kpi-body">
        <p className="ui-kpi-value">
          {value}
          {unit && value !== "—" && <span className="ui-kpi-unit">{unit}</span>}
        </p>
        {comparison ? (
          comparison
        ) : hint ? (
          <p className="ui-kpi-note">{hint}</p>
        ) : (
          <p className="ui-kpi-note" aria-hidden>
            &nbsp;
          </p>
        )}
        {comparison && hint && <p className="ui-kpi-note">{hint}</p>}
      </div>
    </article>
  );
}
