"use client";
import { useMemo, useState } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeStatus, STATUS_CLASSES, STATUS_LABELS, type Document } from "@/modules/documents/types";

interface Props {
  documents: Document[];
  onEdit?: (doc: Document) => void;
}

function dayColor(docs: Document[]): string {
  if (docs.some((d) => computeStatus(d) === "expired")) return "var(--bad)";
  if (docs.some((d) => computeStatus(d) === "expiring")) return "var(--warn)";
  return "var(--info)";
}

export function DocumentsCalendar({ documents, onEdit }: Props) {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const withExpiry = useMemo(() => documents.filter((d) => d.expires_at), [documents]);

  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end }).map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const due = withExpiry.filter((d) => d.expires_at === dateStr);
      return { date, due };
    });
  }, [month, withExpiry]);

  const firstDayOfWeek = (getDay(startOfMonth(month)) + 6) % 7;

  const selectedDocs = selected
    ? withExpiry.filter((d) => d.expires_at && isSameDay(parseISO(d.expires_at), selected))
    : null;

  // Alerts
  const expiredCount = documents.filter((d) => computeStatus(d) === "expired").length;
  const expiringCount = documents.filter((d) => computeStatus(d) === "expiring").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {expiredCount > 0 && (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--bad)", background: "var(--bad-soft)", padding: "10px 16px", fontSize: 13, color: "var(--bad)" }}>
          <span style={{ fontWeight: 500 }}>{expiredCount} expired document{expiredCount !== 1 ? "s" : ""}</span>
        </div>
      )}
      {expiringCount > 0 && (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--warn)", background: "var(--warn-soft)", padding: "10px 16px", fontSize: 13, color: "var(--warn)" }}>
          <span style={{ fontWeight: 500 }}>{expiringCount} document{expiringCount !== 1 ? "s" : ""} expiring within 30 days</span>
        </div>
      )}

      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Button size="icon" variant="ghost" onClick={() => setMonth((m) => subMonths(m, 1))}>
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{format(month, "MMMM yyyy")}</span>
        <Button size="icon" variant="ghost" onClick={() => setMonth((m) => addMonths(m, 1))}>
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>

      {/* Grid */}
      <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--line)", background: "var(--bg-2)" }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="eyebrow" style={{ padding: "8px 0", textAlign: "center", color: "var(--fg-4)" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`e-${i}`} style={{ height: 64, borderBottom: "1px solid var(--line)", borderRight: "1px solid var(--line)", background: "var(--bg)" }} />
          ))}
          {days.map(({ date, due }) => {
            const isToday = isSameDay(date, new Date());
            const isSelected = selected ? isSameDay(date, selected) : false;
            const colIdx = (firstDayOfWeek + date.getDate() - 1) % 7;
            return (
              <div
                key={date.toISOString()}
                onClick={() => due.length > 0 ? setSelected(isSelected ? null : date) : undefined}
                style={{
                  height: 64, padding: 6,
                  borderBottom: "1px solid var(--line)",
                  borderRight: colIdx === 6 ? "none" : "1px solid var(--line)",
                  display: "flex", flexDirection: "column", gap: 2,
                  cursor: due.length > 0 ? "pointer" : "default",
                  background: isSelected ? "var(--bronze-soft)" : "var(--surface)",
                  transition: "background 150ms",
                }}
              >
                <span style={{
                  fontSize: 11, width: 20, height: 20,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "var(--r-pill)",
                  background: isToday ? "var(--fg)" : "transparent",
                  color: isToday ? "var(--surface)" : "var(--fg-4)",
                  fontWeight: isToday ? 600 : 400,
                }}>
                  {date.getDate()}
                </span>
                {due.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 2 }}>
                    {due.slice(0, 3).map((d) => (
                      <span key={d.id} title={d.title} style={{ display: "inline-block", borderRadius: "var(--r-pill)", height: 6, width: 6, background: dayColor([d]) }} />
                    ))}
                    {due.length > 3 && <span style={{ fontSize: 9, color: "var(--fg-4)" }}>+{due.length - 3}</span>}
                  </div>
                )}
                {due.length === 1 && (
                  <div style={{ fontSize: 10, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1 }}>{due[0].title}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail */}
      {selected && selectedDocs && selectedDocs.length > 0 && (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{format(selected, "EEEE, d MMMM yyyy")}</p>
          {selectedDocs.map((d) => {
            const status = computeStatus(d);
            return (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", borderRadius: "var(--r-pill)", padding: "2px 8px", fontSize: 11, fontWeight: 500 }}
                  className={STATUS_CLASSES[status]}>
                  {STATUS_LABELS[status]}
                </span>
                <button
                  type="button"
                  onClick={() => onEdit?.(d)}
                  style={{ fontWeight: 500, color: "var(--fg)", textDecoration: "none", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                >
                  {d.title}
                </button>
                <span style={{ color: "var(--fg-4)", fontSize: 12 }}>{d.location_name ?? ""}</span>
                {d.drive_url && (
                  <a href={d.drive_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", fontSize: 12, color: "var(--fg-4)" }}>Drive ↗</a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--fg-4)" }}>
        {[
          { color: "var(--bad)", label: "Expired" },
          { color: "var(--warn)", label: "Expiring soon" },
          { color: "var(--info)", label: "Future" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block", borderRadius: "var(--r-pill)", height: 8, width: 8, background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
