"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import type { AdminLocation } from "@/modules/admin/types";

export const POSITIONS = ["", "All-rounder", "Bartender", "Cashier", "Manager", "Director"] as const;
export const NATIONALITIES = ["", "Thai", "Burmese", "French", "Other"] as const;
export const THAI_BANKS = [
  "", "Bangkok Bank", "Kasikorn Bank (KBank)", "Siam Commercial Bank (SCB)",
  "Krungthai Bank", "Bank of Ayudhya (Krungsri)", "TMBThanachart Bank (TTB)",
  "Government Savings Bank", "CIMB Thai", "UOB Thailand", "Krungsri", "Other",
] as const;

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
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  credit_note: string;
  service_charge_pct: string;
  employment_start_date?: string;
  employment_end_date?: string;
  service_charge_eligible?: boolean;
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
  bank_name: "",
  bank_account_number: "",
  bank_account_name: "",
  credit_note: "",
  service_charge_pct: "",
  employment_start_date: "",
  employment_end_date: "",
  service_charge_eligible: true,
};

const inputStyle: React.CSSProperties = {
  height: 32,
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--line-strong)",
  background: "var(--bg)",
  color: "var(--fg)",
  padding: "0 10px",
  fontSize: 13,
  outline: "none",
  width: "100%",
};

const sectionStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--line)",
  paddingBottom: 8,
  marginBottom: 12,
};

export function EmployeeForm({
  form,
  locIds,
  primaryLoc,
  locations,
  locationSalaries = {},
  locationEligible = {},
  submitting,
  onChange,
  onToggleLoc,
  onSetPrimary,
  onSalaryChange,
  onEligibleChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  form: EmployeeFormState;
  locIds: Set<string>;
  primaryLoc: string;
  locations: AdminLocation[];
  locationSalaries?: Record<string, string>;
  locationEligible?: Record<string, boolean>;
  submitting: boolean;
  onChange: (key: keyof EmployeeFormState, val: string | boolean) => void;
  onToggleLoc: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onSalaryChange?: (locationId: string, value: string) => void;
  onEligibleChange?: (locationId: string, value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Basic info */}
      <div>
        <p className="eyebrow" style={{ ...sectionStyle, color: "var(--fg-4)" }}>Basic info</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {[
            { label: "First name", key: "first_name" as const, required: true, placeholder: "First name", minW: 130 },
            { label: "Last name", key: "last_name" as const, required: false, placeholder: "Last name", minW: 130 },
          ].map(({ label, key, required, placeholder, minW }) => (
            <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: minW }}>
              <label className="eyebrow" style={{ color: "var(--fg-3)" }}>{label} {required && <span style={{ color: "var(--bad)" }}>*</span>}</label>
              <input type="text" required={required} value={form[key] as string} onChange={(e) => onChange(key, e.target.value)} style={inputStyle} placeholder={placeholder} />
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 150 }}>
            <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Position</label>
            <select value={form.position} onChange={(e) => onChange("position", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {POSITIONS.map((p) => <option key={p} value={p}>{p || "— Select position —"}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 150 }}>
            <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Nationality</label>
            <select value={form.nationality} onChange={(e) => onChange("nationality", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {NATIONALITIES.map((n) => <option key={n} value={n}>{n || "— Select nationality —"}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div>
        <p className="eyebrow" style={{ ...sectionStyle, color: "var(--fg-4)" }}>Contact</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 190 }}>
            <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Email</label>
            <input type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} style={inputStyle} placeholder="employee@example.com" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 150 }}>
            <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Phone</label>
            <input type="text" value={form.phone} onChange={(e) => onChange("phone", e.target.value)} style={inputStyle} placeholder="+66 xx xxx xxxx" />
          </div>
        </div>
      </div>

      {/* Compensation */}
      <div>
        <p className="eyebrow" style={{ ...sectionStyle, color: "var(--fg-4)" }}>Compensation</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 170 }}>
            <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Base salary / month (฿)</label>
            <input type="number" min="0" step="1" value={form.base_salary_monthly} onChange={(e) => onChange("base_salary_monthly", e.target.value)} style={inputStyle} placeholder="e.g. 15000" />
            {form.base_salary_monthly && (
              <p className="mono" style={{ fontSize: 10, color: "var(--fg-4)" }}>
                ≈ ฿{(parseFloat(form.base_salary_monthly) / 208).toFixed(0)}/hr (÷208h)
              </p>
            )}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={form.has_thai_bank_account} onChange={(e) => onChange("has_thai_bank_account", e.target.checked)} style={{ width: 14, height: 14 }} />
            <span style={{ color: "var(--fg)" }}>Thai bank account</span>
            <span style={{ fontSize: 11, color: "var(--fg-4)" }}>(salary paid by transfer)</span>
          </label>
          {form.has_thai_bank_account && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 180 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Bank name</label>
                <select value={form.bank_name} onChange={(e) => onChange("bank_name", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  {THAI_BANKS.map((b) => <option key={b} value={b}>{b || "— Select bank —"}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Account number</label>
                <input type="text" inputMode="numeric" value={form.bank_account_number} onChange={(e) => onChange("bank_account_number", e.target.value.replace(/[^\d-]/g, ""))} style={inputStyle} placeholder="123-4-56789-0" />
                <span style={{ fontSize: 10, color: "var(--fg-4)" }}>5–16 digits (hyphens allowed)</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 180 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Account holder name</label>
                <input type="text" value={form.bank_account_name} onChange={(e) => onChange("bank_account_name", e.target.value)} style={inputStyle} placeholder="Full name as on bank book" />
              </div>
            </>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
            <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Service charge %</label>
            <input type="number" min="0" step="0.1" value={form.service_charge_pct} onChange={(e) => onChange("service_charge_pct", e.target.value)} style={inputStyle} placeholder="location default" />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={form.service_charge_eligible ?? true} onChange={(e) => onChange("service_charge_eligible", e.target.checked)} />
            Eligible for service charge
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 200 }}>
            <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Note</label>
            <input type="text" value={form.credit_note} onChange={(e) => onChange("credit_note", e.target.value)} style={inputStyle} placeholder="e.g. took extra day off Jan 15" />
          </div>
        </div>
      </div>

      <div>
        <p className="eyebrow" style={{ ...sectionStyle, color: "var(--fg-4)" }}>Employment</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 150 }}><label className="eyebrow" style={{ color: "var(--fg-3)" }}>Start date</label><DateInput value={form.employment_start_date ?? ""} onChange={(e) => onChange("employment_start_date", e.target.value)} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 150 }}><label className="eyebrow" style={{ color: "var(--fg-3)" }}>End date</label><DateInput value={form.employment_end_date ?? ""} onChange={(e) => onChange("employment_end_date", e.target.value)} /></div>
        </div>
      </div>

      {/* Identification */}
      <div>
        <p className="eyebrow" style={{ ...sectionStyle, color: "var(--fg-4)" }}>Identification</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
            <label className="eyebrow" style={{ color: "var(--fg-3)" }}>National ID</label>
            <input type="text" value={form.national_id} onChange={(e) => onChange("national_id", e.target.value)} style={inputStyle} placeholder="ID number" />
          </div>
          {form.nationality !== "Thai" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Work permit No.</label>
                <input type="text" value={form.work_permit_number} onChange={(e) => onChange("work_permit_number", e.target.value)} style={inputStyle} placeholder="Permit number" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 150 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Permit expires</label>
                <DateInput value={form.work_permit_expires_at} onChange={(e) => onChange("work_permit_expires_at", e.target.value)} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Location access */}
      {locations.length > 0 && (
        <div>
          <p className="eyebrow" style={{ ...sectionStyle, color: "var(--fg-4)" }}>Location access</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {locations.map((loc) => {
              const checked = locIds.has(loc.id);
              const isPrimary = primaryLoc === loc.id && checked;
              return (
                <label
                  key={loc.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    borderRadius: "var(--r-sm)", border: `1px solid ${checked ? "var(--bronze)" : "var(--line)"}`,
                    padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                    background: checked ? "var(--bronze-soft)" : "var(--bg)",
                    color: checked ? "var(--bronze)" : "var(--fg-3)",
                    transition: "all 150ms",
                  }}
                >
                  <input type="checkbox" className="sr-only" checked={checked} onChange={() => onToggleLoc(loc.id)} />
                  {loc.name}
                  {checked && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); if (!isPrimary) onSetPrimary(loc.id); }}
                        style={{
                          marginLeft: 2, fontSize: 9, fontWeight: 700, borderRadius: "var(--r-sm)", padding: "0 4px",
                          background: isPrimary ? "var(--bronze)" : "transparent",
                          color: isPrimary ? "#fff" : "var(--fg-4)",
                          border: "none", cursor: "pointer",
                        }}
                        title={isPrimary ? "Primary location" : "Set as primary"}
                      >
                        {isPrimary ? "PRIMARY" : "set primary"}
                      </button>
                      {onSalaryChange && (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={locationSalaries[loc.id] ?? ""}
                          onChange={(e) => onSalaryChange(loc.id, e.target.value)}
                          placeholder="฿/mo"
                          title={`Salary at ${loc.name}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 88, height: 22, marginLeft: 4, borderRadius: "var(--r-sm)", border: "1px solid var(--line-strong)", background: "var(--bg)", color: "var(--fg)", padding: "0 6px", fontSize: 11 }}
                        />
                      )}
                      {onEligibleChange && (
                        <label onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer", color: "var(--fg-3)", marginLeft: 4 }}>
                          <input
                            type="checkbox"
                            checked={locationEligible[loc.id] ?? true}
                            onChange={(e) => onEligibleChange(loc.id, e.target.checked)}
                          />
                          SC
                        </label>
                      )}
                    </>
                  )}
                </label>
              );
            })}
          </div>
          {locIds.size > 0 && !primaryLoc && (
            <p style={{ marginTop: 4, fontSize: 11, color: "var(--fg-4)" }}>Click &quot;set primary&quot; on a location to mark it as the main one.</p>
          )}
        </div>
      )}

      {/* Notes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          rows={2}
          style={{ borderRadius: "var(--r-sm)", border: "1px solid var(--line-strong)", background: "var(--bg)", color: "var(--fg)", padding: "6px 10px", fontSize: 13, resize: "none", outline: "none", width: "100%" }}
          placeholder="Internal notes…"
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
