import * as React from "react"
import { createPortal } from "react-dom"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"
import { startOfMonth } from "date-fns"
import { CalendarDaysIcon, ChevronDownIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function parseDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}
function toDay(d: Date): string {
  const y = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${mm}-${dd}`
}
function formatDisplay(value: string): string {
  if (!value) return ""
  const d = parseDay(value)
  if (!d) return value
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (e: any) => void
  placeholder?: string
}

export function DateInput({ value = "", onChange, placeholder = "Select date", className, disabled, ...rest }: DateInputProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [viewMonth, setViewMonth] = React.useState<Date>(() => startOfMonth(parseDay(value) ?? new Date()))
  const [rect, setRect] = React.useState<DOMRect | null>(null)

  React.useEffect(() => {
    if (open) {
      const d = parseDay(value) ?? new Date()
      setViewMonth(startOfMonth(d))
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    }
  }, [open, value])

  // follow trigger on scroll/resize while open
  React.useEffect(() => {
    if (!open) return
    function upd() {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    }
    window.addEventListener("scroll", upd, true)
    window.addEventListener("resize", upd)
    return () => {
      window.removeEventListener("scroll", upd, true)
      window.removeEventListener("resize", upd)
    }
  }, [open])

  const selected = value ? parseDay(value) ?? undefined : undefined
  const display = value ? formatDisplay(value) : ""

  function emit(v: string) {
    if (onChange) {
      // support both synthetic event and direct value handler
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(onChange as any)({ target: { value: v } })
    }
  }

  const panel = open && rect
    ? createPortal(
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 70 }} onClick={() => setOpen(false)} />
          <div
            className="nexus-dp"
            style={{
              position: "fixed",
              zIndex: 71,
              top: Math.min(rect.bottom + 6, typeof window !== "undefined" ? window.innerHeight - 360 : rect.bottom + 6),
              left: Math.max(8, Math.min(rect.left, typeof window !== "undefined" ? window.innerWidth - 340 - 8 : rect.left)),
              borderRadius: "var(--r-lg)",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              boxShadow: "var(--shadow-2)",
              padding: "var(--s-3)",
              width: 320,
            }}
          >
            <DayPicker
              mode="single"
              required={false}
              weekStartsOn={1}
              showOutsideDays
              today={new Date()}
              month={viewMonth}
              onMonthChange={setViewMonth}
              selected={selected}
              onSelect={(d) => {
                if (d) emit(toDay(d))
                else emit("")
                setOpen(false)
              }}
            />
            {value && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    emit("")
                    setOpen(false)
                  }}
                  style={{ fontSize: 12, color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <XIcon style={{ width: 12, height: 12 }} /> Clear
                </button>
              </div>
            )}
          </div>
        </>,
        document.body
      )
    : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          "flex h-8 w-full items-center gap-1.5 rounded-md border bg-background px-2.5 text-left text-xs",
          "border-[var(--line)] bg-[var(--bg)] transition-colors hover:bg-[var(--row-hover)]",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          disabled && "opacity-50 cursor-not-allowed",
          !value && "text-[var(--fg-4)]",
          className
        )}
        style={{ fontSize: 13, color: value ? "var(--fg)" : "var(--fg-4)" }}
        {...(rest as unknown as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        <CalendarDaysIcon size={13} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {display || placeholder}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation()
              emit("")
            }}
            style={{ color: "var(--fg-4)", display: "flex", padding: 2, borderRadius: 4 }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fg-3)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fg-4)")}
          >
            <XIcon style={{ width: 12, height: 12 }} />
          </span>
        ) : (
          <ChevronDownIcon size={12} style={{ color: "var(--fg-4)", flexShrink: 0 }} />
        )}
      </button>
      {panel}
      {/* hidden input for form compatibility / tests */}
      <input type="hidden" value={value} readOnly {...rest} />
    </>
  )
}
