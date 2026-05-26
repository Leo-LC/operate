"use client";
import { useState, useEffect, useRef } from "react";
import { TrashIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Drawer } from "@/components/ui/drawer";
import {
  EMPTY_ENTRY,
  fromFormState,
  salesNetTotal,
  expCashTotal,
  expBankTotal,
  expTotal,
  hrTotal,
  paymentDelta,
  type DailyEntry,
  type EntryFormState,
} from "@/modules/accounting/types";
import { DAILY_ENTRY_SECTIONS } from "@/modules/accounting/config";

type SectionId = "sales" | "payments" | "expenses" | "hr" | "treasury";

interface Props {
  date: string;
  locationName: string;
  form: EntryFormState;
  saving: boolean;
  existingId?: string;
  computedCashEndDay?: number;
  computedCashSafe?: number;
  initialSection?: string;
  onChange: (field: keyof typeof EMPTY_ENTRY, val: string) => void;
  onSave: (e: React.FormEvent) => void;
  onDelete?: () => void;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

function NumInput({
  label,
  field,
  form,
  onChange,
}: {
  label: string;
  field: keyof typeof EMPTY_ENTRY;
  form: EntryFormState;
  onChange: (field: keyof typeof EMPTY_ENTRY, val: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label className="eyebrow" style={{ color: "var(--fg-4)" }}>{label}</label>
      <input
        type="number"
        step="0.01"
        value={form[field] as string}
        onChange={(e) => onChange(field, e.target.value)}
        className="mono tabular-nums"
        style={{
          height: 32,
          borderRadius: "var(--r-sm)",
          border: "1px solid var(--line)",
          background: "var(--bg-2)",
          padding: "0 var(--s-2)",
          fontSize: 13,
          textAlign: "right",
          color: "var(--fg)",
          outline: "none",
          width: "100%",
        }}
      />
    </div>
  );
}

function CalcRow({ label, value }: { label: string; value: number }) {
  const fmtV = (n: number) => n === 0 ? "—" : "฿" + n.toLocaleString("en", { maximumFractionDigits: 0 });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 0" }}>
      <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{label}</span>
      <span className="mono tabular-nums" style={{ fontSize: 12, fontWeight: 500, color: "var(--fg)" }}>{fmtV(value)}</span>
    </div>
  );
}

function ReadOnlyRow({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const fmtV = (n: number) => n === 0 ? "—" : "฿" + n.toLocaleString("en", { maximumFractionDigits: 0 });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <label className="eyebrow" style={{ color: "var(--fg-4)" }}>{label}</label>
        {hint && <span style={{ fontSize: 9, color: "var(--fg-4)", fontStyle: "italic" }}>{hint}</span>}
      </div>
      <div
        className="mono tabular-nums"
        style={{
          height: 32,
          borderRadius: "var(--r-sm)",
          border: "1px solid var(--line)",
          background: "var(--bg-2)",
          padding: "0 var(--s-2)",
          fontSize: 13,
          textAlign: "right",
          color: "var(--fg-4)",
          fontStyle: "italic",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        {fmtV(value)}
      </div>
    </div>
  );
}

export function DailyEntryModal({
  date,
  locationName,
  form,
  saving,
  existingId,
  computedCashEndDay,
  computedCashSafe,
  initialSection,
  onChange,
  onSave,
  onDelete,
  onClose,
  onPrev,
  onNext,
}: Props) {
  const [activeSection, setActiveSection] = useState<SectionId>(
    (initialSection as SectionId | undefined) ?? "sales"
  );

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function scrollToSection(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id as SectionId);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); onNext?.(); }
      if (e.key === "k" || e.key === "ArrowUp")   { e.preventDefault(); onPrev?.(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPrev, onNext]);

  const preview = fromFormState(form) as unknown as DailyEntry;

  const sectionCalcs: Record<SectionId, React.ReactNode> = {
    sales: (
      <CalcRow label="Sales total" value={salesNetTotal(preview)} />
    ),
    payments: (
      <>
        <CalcRow label="Sales total"   value={salesNetTotal(preview)} />
        <CalcRow label="Payment delta" value={paymentDelta(preview)} />
      </>
    ),
    expenses: (
      <>
        <CalcRow label="Cash exp total" value={expCashTotal(preview)} />
        <CalcRow label="Bank exp total" value={expBankTotal(preview)} />
        <CalcRow label="Exp total"      value={expTotal(preview)} />
      </>
    ),
    hr: (
      <CalcRow label="HR total" value={hrTotal(preview)} />
    ),
    treasury: null,
  };

  const footer = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {existingId && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 12, color: "var(--fg-4)", background: "none", border: "none",
              cursor: "pointer", transition: "color var(--dur) var(--ease)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--bad)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-4)")}
          >
            <TrashIcon style={{ width: 13, height: 13 }} />
            Delete entry
          </button>
        ) : null}
        <div style={{ display: "flex", gap: 4, fontSize: 11, color: "var(--fg-4)", alignItems: "center" }}>
          {(onPrev ?? onNext) ? (
            <>
              <Kbd>k</Kbd><span>prev</span>
              <span style={{ marginLeft: 4 }}><Kbd>j</Kbd></span><span>next</span>
              <span style={{ marginLeft: 4 }}><Kbd>esc</Kbd></span><span>close</span>
            </>
          ) : null}
        </div>
      </div>
      <div style={{ display: "flex", gap: "var(--s-2)" }}>
        <Button type="button" size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="sm" form="daily-entry-form" disabled={saving}>
          {saving ? "Saving…" : "Save entry"}
        </Button>
      </div>
    </div>
  );

  const titleNode = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div>
        <div style={{ fontSize: 13, color: "var(--fg-4)", marginBottom: 1 }}>{locationName}</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--fg)" }}>{date}</div>
      </div>
      <div style={{ display: "flex", gap: 2, marginLeft: 4 }}>
        <button
          type="button"
          onClick={onPrev}
          disabled={!onPrev}
          style={{
            width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center",
            borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "transparent",
            color: onPrev ? "var(--fg-3)" : "var(--fg-mute)", cursor: onPrev ? "pointer" : "default",
          }}
        >
          <ChevronLeftIcon style={{ width: 14, height: 14 }} />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!onNext}
          style={{
            width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center",
            borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "transparent",
            color: onNext ? "var(--fg-3)" : "var(--fg-mute)", cursor: onNext ? "pointer" : "default",
          }}
        >
          <ChevronRightIcon style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );

  return (
    <Drawer
      open
      onClose={onClose}
      title={titleNode}
      footer={footer}
    >
      <form id="daily-entry-form" onSubmit={onSave} style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
        {/* Section tabs */}
        <div
          style={{
            display: "flex",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--line)",
            overflow: "hidden",
          }}
        >
          {DAILY_ENTRY_SECTIONS.map((s, i) => {
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollToSection(s.id)}
                style={{
                  flex: 1,
                  padding: "6px 4px",
                  fontSize: 12,
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? s.headerColor : "var(--fg-4)",
                  background: isActive ? s.headerBg : "transparent",
                  borderLeft: i > 0 ? "1px solid var(--line)" : "none",
                  border: "none",
                  cursor: "pointer",
                  transition: "all var(--dur) var(--ease)",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* All sections stacked */}
        {DAILY_ENTRY_SECTIONS.map((s) => (
          <div
            key={s.id}
            ref={(el) => { sectionRefs.current[s.id] = el; }}
            style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}
          >
            {/* Colored section header */}
            <div style={{
              padding: "6px var(--s-4)",
              background: s.headerBg,
              color: s.headerColor,
              borderRadius: "var(--r-md)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
            }}>
              {s.label}
            </div>

            {/* Fields grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--s-3) var(--s-4)" }}>
              {s.id !== "treasury" && s.fields.filter((f) => !f.calculated).map((f) => (
                <NumInput
                  key={f.key as string}
                  field={f.key as keyof typeof EMPTY_ENTRY}
                  label={f.label}
                  form={form}
                  onChange={onChange}
                />
              ))}
              {s.id === "treasury" && (
                <>
                  <ReadOnlyRow label="Cash end of day" value={computedCashEndDay ?? 0} hint="auto" />
                  <NumInput field="cash_to_boss" label="Cash to boss" form={form} onChange={onChange} />
                  <ReadOnlyRow label="Cash safe" value={computedCashSafe ?? 0} hint="auto" />
                </>
              )}
            </div>

            {/* Section calculated summary */}
            {sectionCalcs[s.id as SectionId] && (
              <div style={{ borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--bg-2)", padding: "var(--s-3) var(--s-4)" }}>
                <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 6 }}>Calculated</p>
                {sectionCalcs[s.id as SectionId]}
              </div>
            )}
          </div>
        ))}

        {/* Notes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => onChange("notes" as keyof typeof EMPTY_ENTRY, e.target.value)}
            rows={2}
            style={{
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--line)",
              background: "var(--bg-2)",
              padding: "var(--s-2) var(--s-3)",
              fontSize: 13,
              color: "var(--fg)",
              resize: "none",
              outline: "none",
              fontFamily: "var(--font-sans)",
            }}
          />
        </div>

        {/* Global live totals */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "var(--s-2)",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--line)",
            background: "var(--surface)",
            padding: "var(--s-3) var(--s-4)",
          }}
        >
          {[
            { label: "Sales",    value: salesNetTotal(preview),  color: "var(--good)" },
            { label: "Exp cash", value: expCashTotal(preview),   color: "var(--warn)" },
            { label: "Exp bank", value: expBankTotal(preview),   color: "var(--warn)" },
            { label: "HR",       value: hrTotal(preview),        color: "var(--bad)" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="eyebrow" style={{ color: "var(--fg-4)" }}>{label}</p>
              <p className="mono tabular-nums" style={{ fontSize: 13, fontWeight: 600, color: value === 0 ? "var(--fg-4)" : color }}>
                {value === 0 ? "—" : "฿" + value.toLocaleString("en", { maximumFractionDigits: 0 })}
              </p>
            </div>
          ))}
        </div>
      </form>
    </Drawer>
  );
}
