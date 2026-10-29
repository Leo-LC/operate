import { KIND_LABELS, paletteToStyles, type ShiftPalette } from "@/modules/scheduling/lib/colors";

/** The shift kinds that carry real meaning on the grids; render these as a
 *  small always-visible swatch row so cell colors are never the only carrier
 *  of meaning (hover/Settings-recall is not a substitute). */
const LEGEND_KINDS = ["opening", "daytime", "closing", "off"] as const;

export function ShiftKindLegend({ palette, className }: { palette?: ShiftPalette | null; className?: string }) {
  const styles = paletteToStyles(palette ?? {});
  return (
    <div
      className={className ?? "flex flex-wrap items-center gap-3 text-xs print:hidden"}
      aria-label="Shift colour legend"
    >
      {LEGEND_KINDS.map((k) => {
        const st = styles[k];
        return (
          <span
            key={k}
            className="inline-flex items-center gap-1.5"
            style={{ color: "var(--fg-3)" }}
          >
            <span
              aria-hidden
              className="inline-block size-2.5 rounded-sm border"
              style={{
                background: k === "off" ? "var(--line-2)" : st.bg,
                borderColor: k === "off" ? "var(--line-strong)" : st.fg,
              }}
            />
            {KIND_LABELS[k]}
          </span>
        );
      })}
    </div>
  );
}
