"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import type { AdminLocation } from "@/modules/admin/types";

export const POSITIONS = ["", "All-rounder", "Bartender", "Cashier", "Manager", "Director"] as const;
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
  credit_note: string;
  service_charge_pct: string;
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
  credit_note: "",
  service_charge_pct: "",
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
            <input type="number" min="0" step="100" value={form.base_salary_monthly} onChange={(e) => onChange("base_salary_monthly", e.target.value)} style={inputStyle} placeholder="e.g. 15000" />
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
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
            <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Service charge %</label>
            <input type="number" min="0" step="0.1" value={form.service_charge_pct} onChange={(e) => onChange("service_charge_pct", e.target.value)} style={inputStyle} placeholder="location default" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 200 }}>
            <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Note</label>
            <input type="text" value={form.credit_note} onChange={(e) => onChange("credit_note", e.target.value)} style={inputStyle} placeholder="e.g. took extra day off Jan 15" />
          </div>
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
