"use client";

import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import type { AdminLocation } from "@/modules/admin/types";

export const POSITIONS = ["", "All-rounder", "Cashier", "Manager", "Director", "Other"] as const;
export const NATIONALITIES = ["", "Thai", "Burmese", "French", "Other"] as const;

export type EmployeeFormState = {
  first_name: string;
  last_name: string;
  position: string;
  nationality: string;
  national_id: string;
  work_permit_number: string;
  work_permit_expires_at: string;
  email: string;
  phone: string;
  notes: string;
  base_salary_monthly: string;
  has_thai_bank_account: boolean;
};

export const EMPTY_EMPLOYEE_FORM: EmployeeFormState = {
  first_name: "",
  last_name: "",
  position: "",
  nationality: "",
  national_id: "",
  work_permit_number: "",
  work_permit_expires_at: "",
  email: "",
  phone: "",
  notes: "",
  base_salary_monthly: "",
  has_thai_bank_account: false,
};

export function EmployeeForm({
  form,
  locIds,
  primaryLoc,
  locations,
  submitting,
  onChange,
  onToggleLoc,
  onSetPrimary,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  form: EmployeeFormState;
  locIds: Set<string>;
  primaryLoc: string;
  locations: AdminLocation[];
  submitting: boolean;
  onChange: (key: keyof EmployeeFormState, val: string | boolean) => void;
  onToggleLoc: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-muted/20 p-5 flex flex-col gap-5">
      {/* Basic info */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Basic info</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1 min-w-[130px]">
            <label className="text-xs font-medium text-muted-foreground">First name <span className="text-destructive">*</span></label>
            <input
              type="text" required value={form.first_name}
              onChange={(e) => onChange("first_name", e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="First name"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[130px]">
            <label className="text-xs font-medium text-muted-foreground">Last name <span className="text-destructive">*</span></label>
            <input
              type="text" required value={form.last_name}
              onChange={(e) => onChange("last_name", e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="Last name"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-xs font-medium text-muted-foreground">Position</label>
            <select
              value={form.position}
              onChange={(e) => onChange("position", e.target.value)}
              className="h-8 rounded-md border border-input bg-background pl-2 pr-7 text-sm"
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p || "— Select position —"}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-xs font-medium text-muted-foreground">Nationality</label>
            <select
              value={form.nationality}
              onChange={(e) => onChange("nationality", e.target.value)}
              className="h-8 rounded-md border border-input bg-background pl-2 pr-7 text-sm"
            >
              {NATIONALITIES.map((n) => (
                <option key={n} value={n}>{n || "— Select nationality —"}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contact</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1 min-w-[190px]">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email" value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="employee@example.com"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-xs font-medium text-muted-foreground">Phone</label>
            <input
              type="text" value={form.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="+66 xx xxx xxxx"
            />
          </div>
        </div>
      </div>

      {/* Salary */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Compensation</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-[170px]">
            <label className="text-xs font-medium text-muted-foreground">Base salary / month (฿)</label>
            <input
              type="number" min="0" step="100" value={form.base_salary_monthly}
              onChange={(e) => onChange("base_salary_monthly", e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="e.g. 15000"
            />
            {form.base_salary_monthly && (
              <p className="text-[10px] text-muted-foreground">
                ≈ ฿{(parseFloat(form.base_salary_monthly) / 208).toFixed(0)}/hr (÷208h)
              </p>
            )}
          </div>
          <label className="flex items-center gap-2 mb-1 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={form.has_thai_bank_account}
              onChange={(e) => onChange("has_thai_bank_account", e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">Thai bank account</span>
            <span className="text-[11px] text-muted-foreground">(salary paid by transfer)</span>
          </label>
        </div>
      </div>

      {/* Identification */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Identification</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground">National ID</label>
            <input
              type="text" value={form.national_id}
              onChange={(e) => onChange("national_id", e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="ID number"
            />
          </div>
          {form.nationality !== "Thai" && (
            <>
              <div className="flex flex-col gap-1 min-w-[160px]">
                <label className="text-xs font-medium text-muted-foreground">Work permit No.</label>
                <input
                  type="text" value={form.work_permit_number}
                  onChange={(e) => onChange("work_permit_number", e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  placeholder="Permit number"
                />
              </div>
              <div className="flex flex-col gap-1 min-w-[150px]">
                <label className="text-xs font-medium text-muted-foreground">Permit expires</label>
                <DateInput
                  value={form.work_permit_expires_at}
                  onChange={(e) => onChange("work_permit_expires_at", e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Location access */}
      {locations.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Location access</p>
          <div className="flex flex-wrap gap-2">
            {locations.map((loc) => {
              const checked = locIds.has(loc.id);
              const isPrimary = primaryLoc === loc.id && checked;
              return (
                <label
                  key={loc.id}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                    checked
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => onToggleLoc(loc.id)}
                  />
                  {loc.name}
                  {checked && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); if (!isPrimary) onSetPrimary(loc.id); }}
                      className={`ml-0.5 text-[9px] font-semibold rounded px-1 ${isPrimary ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      title={isPrimary ? "Primary location" : "Set as primary"}
                    >
                      {isPrimary ? "PRIMARY" : "set primary"}
                    </button>
                  )}
                </label>
              );
            })}
          </div>
          {locIds.size > 0 && !primaryLoc && (
            <p className="mt-1 text-[11px] text-muted-foreground">Click &quot;set primary&quot; on a location to mark it as the main one.</p>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none"
          placeholder="Internal notes…"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
