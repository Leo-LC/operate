"use client";
import { useMemo, useState } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Animal } from "@/modules/animals/types";

interface Props {
  animals: Animal[];
}

type DayInfo = {
  date: Date;
  due: Animal[];    // next_vaccination_date on this day
  overdue: Animal[]; // next_vaccination_date in the past
};

function vaccinationUrgency(next: string | null): "overdue" | "soon" | "ok" | "none" {
  if (!next) return "none";
  const diff = (parseISO(next).getTime() - Date.now()) / 86400000;
  if (diff < 0) return "overdue";
  if (diff <= 30) return "soon";
  return "ok";
}

const URGENCY_COLOR: Record<string, string> = {
  overdue: "var(--bad)",
  soon: "var(--warn)",
  ok: "var(--good)",
  none: "var(--fg-4)",
};

export function VaccinationCalendar({ animals }: Props) {
  const [month, setMonth] = useState(new Date());

  const days = useMemo((): DayInfo[] => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end }).map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const today = format(new Date(), "yyyy-MM-dd");
      const due = animals.filter((a) => a.next_vaccination_date === dateStr);
      const overdue = date < new Date(today + "T00:00:00")
        ? animals.filter((a) => a.next_vaccination_date && a.next_vaccination_date < today && a.next_vaccination_date === dateStr)
        : [];
      return { date, due, overdue };
    });
  }, [month, animals]);

  const firstDayOfWeek = (getDay(startOfMonth(month)) + 6) % 7; // Mon=0

  // Animals with overdue vaccinations (for summary)
  const overdueAnimals = animals.filter((a) => vaccinationUrgency(a.next_vaccination_date) === "overdue");
  const soonAnimals = animals.filter((a) => vaccinationUrgency(a.next_vaccination_date) === "soon");

  const [selected, setSelected] = useState<Date | null>(null);
  const selectedAnimals = selected
    ? animals.filter((a) => a.next_vaccination_date && isSameDay(parseISO(a.next_vaccination_date), selected))
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary alerts */}
      {overdueAnimals.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
          <span className="font-medium">{overdueAnimals.length} overdue:</span>{" "}
          {overdueAnimals.map((a) => a.name).join(", ")}
        </div>
      )}
      {soonAnimals.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          <span className="font-medium">{soonAnimals.length} due within 30 days:</span>{" "}
          {soonAnimals.map((a) => a.name).join(", ")}
        </div>
      )}

      {/* Month nav */}
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" className="size-8" onClick={() => setMonth((m) => subMonths(m, 1))}>
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="flex-1 text-center text-sm font-medium">{format(month, "MMMM yyyy")}</span>
        <Button size="icon" variant="ghost" className="size-8" onClick={() => setMonth((m) => addMonths(m, 1))}>
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
            <div key={`empty-${i}`} style={{ height: 64, borderBottom: "1px solid var(--line)", borderRight: "1px solid var(--line)", background: "var(--bg)" }} />
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
                  height: 64,
                  borderBottom: "1px solid var(--line)",
                  borderRight: colIdx === 6 ? "none" : "1px solid var(--line)",
                  padding: 6,
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  {due.slice(0, 3).map((a) => (
                    <span
                      key={a.id}
                      title={a.name}
                      style={{ display: "inline-block", borderRadius: "var(--r-pill)", height: 6, width: 6, background: URGENCY_COLOR[vaccinationUrgency(a.next_vaccination_date)] }}
                    />
                  ))}
                  {due.length > 3 && (
                    <span style={{ fontSize: 9, color: "var(--fg-4)" }}>+{due.length - 3}</span>
                  )}
                </div>
                {due.length > 0 && due.length <= 2 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {due.map((a) => (
                      <div key={a.id} style={{ fontSize: 10, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1 }}>{a.name}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selected && selectedAnimals && selectedAnimals.length > 0 && (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{format(selected, "EEEE, d MMMM yyyy")}</p>
          {selectedAnimals.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span style={{ display: "inline-block", borderRadius: "var(--r-pill)", height: 8, width: 8, flexShrink: 0, background: URGENCY_COLOR[vaccinationUrgency(a.next_vaccination_date)] }} />
              <span style={{ fontWeight: 500, color: "var(--fg)" }}>{a.name}</span>
              <span style={{ color: "var(--fg-4)", textTransform: "capitalize", fontSize: 12 }}>{a.species}</span>
              <span style={{ color: "var(--fg-4)", fontSize: 12 }}>{a.location_name ?? ""}</span>
              {a.vaccination_passport && (
                <span style={{ marginLeft: "auto", fontSize: 10, borderRadius: "var(--r-pill)", background: "var(--good-soft)", color: "var(--good)", padding: "2px 6px" }}>Passport ✓</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--fg-4)" }}>
        {[
          { color: "var(--bad)", label: "Overdue" },
          { color: "var(--warn)", label: "Within 30 days" },
          { color: "var(--good)", label: "Scheduled (>30d)" },
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
