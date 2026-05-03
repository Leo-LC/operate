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

const URGENCY_DOT: Record<string, string> = {
  overdue: "bg-red-500",
  soon: "bg-amber-400",
  ok: "bg-green-500",
  none: "bg-muted",
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
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 border-b border-r border-border last:border-r-0 bg-muted/10" />
          ))}
          {days.map(({ date, due }) => {
            const isToday = isSameDay(date, new Date());
            const isSelected = selected ? isSameDay(date, selected) : false;
            const colIdx = (firstDayOfWeek + date.getDate() - 1) % 7;
            return (
              <div
                key={date.toISOString()}
                onClick={() => due.length > 0 ? setSelected(isSelected ? null : date) : undefined}
                className={[
                  "h-16 border-b border-r border-border last:border-r-0 p-1.5 flex flex-col gap-0.5 transition-colors",
                  due.length > 0 ? "cursor-pointer hover:bg-muted/30" : "",
                  isSelected ? "bg-accent" : "",
                  colIdx === 6 ? "border-r-0" : "",
                ].join(" ")}
              >
                <span className={`text-xs w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-foreground text-background font-semibold" : "text-muted-foreground"}`}>
                  {date.getDate()}
                </span>
                <div className="flex flex-wrap gap-0.5">
                  {due.slice(0, 3).map((a) => (
                    <span
                      key={a.id}
                      title={a.name}
                      className={`inline-block rounded-full h-1.5 w-1.5 ${URGENCY_DOT[vaccinationUrgency(a.next_vaccination_date)]}`}
                    />
                  ))}
                  {due.length > 3 && (
                    <span className="text-[9px] text-muted-foreground">+{due.length - 3}</span>
                  )}
                </div>
                {due.length > 0 && due.length <= 2 && (
                  <div className="mt-0.5 space-y-0.5">
                    {due.map((a) => (
                      <div key={a.id} className="text-[10px] text-foreground truncate leading-none">{a.name}</div>
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
        <div className="rounded-lg border border-border p-3 flex flex-col gap-2">
          <p className="text-sm font-medium">{format(selected, "EEEE, d MMMM yyyy")}</p>
          {selectedAnimals.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-sm">
              <span className={`inline-block rounded-full h-2 w-2 shrink-0 ${URGENCY_DOT[vaccinationUrgency(a.next_vaccination_date)]}`} />
              <span className="font-medium">{a.name}</span>
              <span className="text-muted-foreground capitalize text-xs">{a.species}</span>
              <span className="text-muted-foreground text-xs">{a.location_name ?? ""}</span>
              {a.vaccination_passport && (
                <span className="ml-auto text-[10px] rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5">Passport ✓</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        {[
          { color: "bg-red-500", label: "Overdue" },
          { color: "bg-amber-400", label: "Within 30 days" },
          { color: "bg-green-500", label: "Scheduled (>30d)" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`inline-block rounded-full h-2 w-2 ${color}`} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
