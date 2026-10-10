/**
 * Dedicated, print/raster-safe schedule layout for JPEG + PDF export.
 * All styles are inline (no CSS vars) so the output is identical on paper,
 * in the PDF iframe and in the rasterized JPEG.
 */

export interface ExportCell {
  main: string;
  sub?: string;
  bg: string;
  fg: string;
}

export interface ExportRow {
  name: string;
  cells: ExportCell[];
  total: string;
}

interface Props {
  brand: string; // e.g. "CAPYBARA COFFEE — PATTAYA"
  title: string; // e.g. "Week of 5 – 11 October 2026"
  dayHeaders: string[]; // 7 × e.g. "Mon 5"
  rows: ExportRow[];
  footer: string;
}

function parseDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** "5 – 11 October 2026" style title for a Monday (long month names). */
export function formatWeekTitle(monday: string): string {
  const start = parseDay(monday);
  if (!start) return monday;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const day = (d: Date) => d.getDate();
  const mon = (d: Date) => d.toLocaleDateString("en-GB", { month: "long" });
  if (start.getMonth() === end.getMonth()) {
    return `Week of ${day(start)} – ${day(end)} ${mon(end)} ${end.getFullYear()}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `Week of ${day(start)} ${mon(start)} – ${day(end)} ${mon(end)} ${end.getFullYear()}`;
  }
  return `Week of ${day(start)} ${mon(start)} ${start.getFullYear()} – ${day(end)} ${mon(end)} ${end.getFullYear()}`;
}

const INK = "#0f172a";
const MUTED = "#64748b";
const HAIRLINE = "#e2e8f0";

export function WeekExportCard({ brand, title, dayHeaders, rows, footer }: Props) {
  return (
    <div
      style={{
        width: 1100,
        background: "#ffffff",
        color: INK,
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        padding: 36,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.08em" }}>{brand}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: MUTED, marginTop: 4 }}>{title}</div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: `2px solid ${INK}`, minWidth: 130 }}>
              Staff
            </th>
            {dayHeaders.map((h) => (
              <th
                key={h}
                style={{ textAlign: "center", padding: "8px 6px", borderBottom: `2px solid ${INK}`, minWidth: 100 }}
              >
                {h}
              </th>
            ))}
            <th style={{ textAlign: "center", padding: "8px 10px", borderBottom: `2px solid ${INK}` }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td style={{ padding: "7px 10px", borderBottom: `1px solid ${HAIRLINE}`, fontWeight: 700 }}>{r.name}</td>
              {r.cells.map((c, i) => (
                <td
                  key={i}
                  style={{ padding: "7px 6px", borderBottom: `1px solid ${HAIRLINE}`, textAlign: "center", background: c.bg }}
                >
                  <div style={{ fontWeight: 700, color: c.fg, fontVariantNumeric: "tabular-nums" }}>{c.main}</div>
                  {c.sub && <div style={{ fontSize: 10, color: c.fg, marginTop: 1 }}>{c.sub}</div>}
                </td>
              ))}
              <td
                style={{
                  padding: "7px 10px",
                  borderBottom: `1px solid ${HAIRLINE}`,
                  textAlign: "center",
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {r.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 14, fontSize: 10, color: MUTED, textAlign: "center" }}>{footer}</div>
    </div>
  );
}
