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
  if (docs.some((d) => computeStatus(d) === "expired")) return "bg-red-500";
  if (docs.some((d) => computeStatus(d) === "expiring")) return "bg-amber-400";
  return "bg-blue-400";
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
    <div className="flex flex-col gap-4">
      {expiredCount > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
          <span className="font-medium">{expiredCount} expired document{expiredCount !== 1 ? "s" : ""}</span>
        </div>
      )}
      {expiringCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          <span className="font-medium">{expiringCount} document{expiringCount !== 1 ? "s" : ""} expiring within 30 days</span>
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
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`e-${i}`} className="h-16 border-b border-r border-border bg-muted/10" />
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
                  "h-16 border-b border-r border-border p-1.5 flex flex-col gap-0.5 transition-colors",
                  due.length > 0 ? "cursor-pointer hover:bg-muted/30" : "",
                  isSelected ? "bg-accent" : "",
                  colIdx === 6 ? "border-r-0" : "",
                ].join(" ")}
              >
                <span className={`text-xs w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-foreground text-background font-semibold" : "text-muted-foreground"}`}>
                  {date.getDate()}
                </span>
                {due.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {due.slice(0, 3).map((d) => (
                      <span key={d.id} title={d.title} className={`inline-block rounded-full h-1.5 w-1.5 ${dayColor([d])}`} />
                    ))}
                    {due.length > 3 && <span className="text-[9px] text-muted-foreground">+{due.length - 3}</span>}
                  </div>
                )}
                {due.length === 1 && (
                  <div className="text-[10px] text-foreground truncate leading-none">{due[0].title}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail */}
      {selected && selectedDocs && selectedDocs.length > 0 && (
        <div className="rounded-lg border border-border p-3 flex flex-col gap-2">
          <p className="text-sm font-medium">{format(selected, "EEEE, d MMMM yyyy")}</p>
          {selectedDocs.map((d) => {
            const status = computeStatus(d);
            return (
              <div key={d.id} className="flex items-center gap-2 text-sm flex-wrap">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>
                  {STATUS_LABELS[status]}
                </span>
                <button
                  type="button"
                  onClick={() => onEdit?.(d)}
                  className="font-medium hover:underline text-left"
                >
                  {d.title}
                </button>
                <span className="text-muted-foreground text-xs">{d.location_name ?? ""}</span>
                {d.drive_url && (
                  <a href={d.drive_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-muted-foreground hover:text-foreground underline">Drive ↗</a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        {[
          { color: "bg-red-500", label: "Expired" },
          { color: "bg-amber-400", label: "Expiring soon" },
          { color: "bg-blue-400", label: "Future" },
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
