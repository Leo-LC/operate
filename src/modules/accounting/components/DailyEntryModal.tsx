"use client";
import { useState } from "react";
import { XIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  /** Auto-computed cash end of day (payment_cash − exp_cash_total) */
  computedCashEndDay?: number;
  /** Auto-computed cash safe (prev_safe + cash_end_day − cash_to_boss) */
  computedCashSafe?: number;
  /** Open the modal on this section tab (matches the table's current tab) */
  initialSection?: string;
  onChange: (field: keyof typeof EMPTY_ENTRY, val: string) => void;
  onSave: (e: React.FormEvent) => void;
  onDelete?: () => void;
  onClose: () => void;
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
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      <input
        type="number"
        step="0.01"
        value={form[field] as string}
        onChange={(e) => onChange(field, e.target.value)}
        className="h-7 rounded border border-border bg-muted/30 px-2 text-xs text-right text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

function CalcRow({ label, value }: { label: string; value: number }) {
  const fmt = (n: number) => n === 0 ? "—" : n.toLocaleString("en", { maximumFractionDigits: 0 });
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{fmt(value)}</span>
    </div>
  );
}

function ReadOnlyRow({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const fmt = (n: number) => n === 0 ? "—" : n.toLocaleString("en", { maximumFractionDigits: 0 });
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
        {hint && <span className="text-[9px] text-muted-foreground/60 italic">{hint}</span>}
      </div>
      <div className="h-7 rounded border border-border/40 bg-muted/10 px-2 text-xs text-right text-muted-foreground italic flex items-center justify-end">
        {fmt(value)}
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
}: Props) {
  const [activeSection, setActiveSection] = useState<SectionId>(
    (initialSection as SectionId | undefined) ?? "sales"
  );

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

  const currentSection = DAILY_ENTRY_SECTIONS.find((s) => s.id === activeSection)!;
  // Editable fields for this section (exclude calculated + treasury computed fields)
  const editableFields = currentSection.fields.filter(
    (f) => !f.calculated && f.key !== "cash_end_day" && f.key !== "cash_safe"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-xl rounded-xl border border-border bg-background p-5 shadow-xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold">{date}</h2>
            <p className="text-xs text-muted-foreground">{locationName}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Section tabs — active tab uses same color as main table */}
        <div className="flex rounded-md border border-border overflow-hidden mb-4 text-xs">
          {DAILY_ENTRY_SECTIONS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id as SectionId)}
              className={`flex-1 px-2 py-1.5 ${i > 0 ? "border-l border-border" : ""} ${
                activeSection === s.id
                  ? `${s.badgeClass} font-medium`
                  : "text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSave} className="flex flex-col gap-4">
          {/* Section editable fields */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {editableFields.map((f) => (
              <NumInput
                key={f.key as string}
                field={f.key as keyof typeof EMPTY_ENTRY}
                label={f.label}
                form={form}
                onChange={onChange}
              />
            ))}

            {/* Treasury section: show computed fields as read-only */}
            {activeSection === "treasury" && (
              <>
                <ReadOnlyRow
                  label="Cash end of day"
                  value={computedCashEndDay ?? 0}
                  hint="auto"
                />
                <NumInput
                  field="cash_to_boss"
                  label="Cash to boss"
                  form={form}
                  onChange={onChange}
                />
                <ReadOnlyRow
                  label="Cash safe"
                  value={computedCashSafe ?? 0}
                  hint="auto"
                />
              </>
            )}
          </div>

          {/* Calculated summary for the section */}
          {sectionCalcs[activeSection] && (
            <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs border border-border/40">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Calculated</p>
              {sectionCalcs[activeSection]}
            </div>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => onChange("notes" as keyof typeof EMPTY_ENTRY, e.target.value)}
              rows={2}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none"
            />
          </div>

          {/* Global live totals */}
          <div className="grid grid-cols-4 gap-2 rounded-lg bg-muted/20 border border-border/40 px-3 py-2 text-xs">
            {[
              { label: "Sales",    value: salesNetTotal(preview) },
              { label: "Exp cash", value: expCashTotal(preview) },
              { label: "Exp bank", value: expBankTotal(preview) },
              { label: "HR",       value: hrTotal(preview) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="font-semibold tabular-nums">
                  {value === 0 ? "—" : value.toLocaleString("en", { maximumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            {existingId && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <TrashIcon className="size-3.5" />
                Delete entry
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save entry"}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
