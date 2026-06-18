"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  MapPinIcon,
  PhoneIcon,
  ReceiptIcon,
  GlobeIcon,
  FileTextIcon,
  UsersIcon,
  BuildingIcon,
  CheckIcon,
  XIcon,
  LinkIcon,
} from "lucide-react";
import type { AdminLocation } from "@/modules/admin/types";

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  location_id: string | null;
  active: boolean;
}

interface LocationsClientProps {
  initialLocations: AdminLocation[];
  employees: StaffMember[];
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const EMPTY_FORM = {
  name: "",
  slug: "",
  external_id: "",
  address_en: "",
  address_th: "",
  phone: "",
  vat_number: "",
  google_maps_url: "",
  google_sheet_id: "",
  notes: "",
};

type FormState = typeof EMPTY_FORM;

function InfoRow({
  icon: Icon,
  label,
  value,
  multiline = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <Icon style={{ width: 16, height: 16, color: "var(--fg-4)", marginTop: 2, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 11, color: "var(--fg-4)", marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 13, color: "var(--fg)", whiteSpace: multiline ? "pre-wrap" : undefined, wordBreak: "break-word" }}>{value}</p>
      </div>
    </div>
  );
}

const FIELD_INPUT: React.CSSProperties = {
  width: "100%",
  height: 32,
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--line-strong)",
  background: "var(--bg)",
  color: "var(--fg)",
  padding: "0 10px",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

function FormField({
  label,
  name,
  value,
  onChange,
  placeholder,
  multiline = false,
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label className="eyebrow" style={{ color: "var(--fg-3)" }}>
        {label}
        {required && <span style={{ color: "var(--bad)", marginLeft: 2 }}>*</span>}
      </label>
      {multiline ? (
        <textarea
          name={name}
          style={{ ...FIELD_INPUT, height: "auto", padding: "6px 10px", resize: "none" }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <input
          name={name}
          style={FIELD_INPUT}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
      )}
    </div>
  );
}

function LocationListItem({ loc, active, onClick }: { loc: AdminLocation; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <li style={{ borderBottom: "1px solid var(--line)" }}>
      <button
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          fontSize: 13,
          fontWeight: active ? 500 : 400,
          color: active ? "var(--bronze)" : hovered ? "var(--fg)" : "var(--fg-3)",
          background: active ? "var(--bronze-soft)" : hovered ? "var(--row-hover)" : "transparent",
          border: "none",
          cursor: "pointer",
          transition: "background 150ms, color 150ms",
        }}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {loc.name}
        {!loc.is_active && (
          <span style={{ marginLeft: 6, fontSize: 11, color: "var(--fg-4)" }}>(opening soon)</span>
        )}
      </button>
    </li>
  );
}

export function LocationsClient({ initialLocations, employees }: LocationsClientProps) {
  const router = useRouter();
  const [locations, setLocations] = useState(initialLocations);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialLocations[0]?.id ?? null
  );
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const selected = locations.find((l) => l.id === selectedId) ?? null;
  const locationStaff = employees.filter((e) => e.location_id === selectedId);

  function setField(key: keyof FormState, val: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "name") next.slug = slugify(val);
      return next;
    });
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setIsAdding(true);
    setIsEditing(false);
    setSelectedId(null);
  }

  function openEdit(loc: AdminLocation) {
    setForm({
      name: loc.name,
      slug: loc.slug,
      external_id: loc.external_id ?? "",
      address_en: loc.address_en ?? "",
      address_th: loc.address_th ?? "",
      phone: loc.phone ?? "",
      vat_number: loc.vat_number ?? "",
      google_maps_url: loc.google_maps_url ?? "",
      google_sheet_id: loc.google_sheet_id ?? "",
      notes: loc.notes ?? "",
    });
    setIsEditing(true);
    setIsAdding(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          external_id: form.external_id.trim() || null,
          address_en: form.address_en.trim() || null,
          address_th: form.address_th.trim() || null,
          phone: form.phone.trim() || null,
          vat_number: form.vat_number.trim() || null,
          google_maps_url: form.google_maps_url.trim() || null,
          google_sheet_id: form.google_sheet_id.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create location");
      }
      const created: AdminLocation = await res.json();
      setLocations((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setSelectedId(created.id);
      setIsAdding(false);
      toast.success(`Location "${created.name}" created`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !form.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/locations/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          external_id: form.external_id.trim() || null,
          address_en: form.address_en.trim() || null,
          address_th: form.address_th.trim() || null,
          phone: form.phone.trim() || null,
          vat_number: form.vat_number.trim() || null,
          google_maps_url: form.google_maps_url.trim() || null,
          google_sheet_id: form.google_sheet_id.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update");
      }
      const updated: AdminLocation = await res.json();
      setLocations((prev) =>
        prev
          .map((l) => (l.id === updated.id ? updated : l))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setIsEditing(false);
      toast.success("Location updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(loc: AdminLocation) {
    if (!confirm(`Delete "${loc.name}"? This cannot be undone.`)) return;
    setDeletingId(loc.id);
    try {
      const res = await fetch(`/api/admin/locations/${loc.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete");
      }
      const remaining = locations.filter((l) => l.id !== loc.id);
      setLocations(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setIsEditing(false);
      toast.success(`Location "${loc.name}" deleted`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleOpen(loc: AdminLocation) {
    setOpeningId(loc.id);
    try {
      const res = await fetch(`/api/admin/locations/${loc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to open location");
      }
      const updated: AdminLocation = await res.json();
      setLocations((prev) =>
        prev
          .map((l) => (l.id === updated.id ? updated : l))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      toast.success(`"${updated.name}" is now live`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setOpeningId(null);
    }
  }

  const formPanel = (
    <form
      onSubmit={isAdding ? handleAdd : handleSaveEdit}
      style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
          {isAdding ? "New location" : `Edit — ${selected?.name}`}
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="submit" size="sm" disabled={submitting}>
            <CheckIcon className="mr-1.5 size-3.5" />
            {submitting ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => { setIsAdding(false); setIsEditing(false); }}
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 }}>
        <FormField
          label="Name"
          name="name"
          value={form.name}
          onChange={(v) => setField("name", v)}
          placeholder="Branch name"
          required
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={(v) => setField("phone", v)}
            placeholder="+66 2 000 0000"
          />
          <FormField
            label="VAT number"
            name="vat_number"
            value={form.vat_number}
            onChange={(v) => setField("vat_number", v)}
            placeholder="0105XXXXXXXXX"
          />
        </div>
        <FormField
          label="Address (English)"
          name="address_en"
          value={form.address_en}
          onChange={(v) => setField("address_en", v)}
          placeholder="123 Main St, Bangkok 10110"
          multiline
        />
        <FormField
          label="Address (Thai)"
          name="address_th"
          value={form.address_th}
          onChange={(v) => setField("address_th", v)}
          placeholder="123 ถนน… กรุงเทพ 10110"
          multiline
        />
        <FormField
          label="GBP Location ID"
          name="external_id"
          value={form.external_id}
          onChange={(v) => setField("external_id", v)}
          placeholder="locations/1234567890123456789"
        />
        <FormField
          label="Google Maps URL"
          name="google_maps_url"
          value={form.google_maps_url}
          onChange={(v) => setField("google_maps_url", v)}
          placeholder="https://maps.google.com/…"
        />
        <FormField
          label="Accounting Sheet ID"
          name="google_sheet_id"
          value={form.google_sheet_id}
          onChange={(v) => setField("google_sheet_id", v)}
          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
        />
        <FormField
          label="Notes"
          name="notes"
          value={form.notes}
          onChange={(v) => setField("notes", v)}
          placeholder="Any additional information…"
          multiline
        />
      </div>
    </form>
  );

  const detailPanel = selected && !isEditing && !isAdding && (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}>{selected.name}</h2>
          {!selected.is_active && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--bronze)",
                background: "var(--bronze-soft)",
                borderRadius: 999,
                padding: "2px 8px",
              }}
            >
              Opening soon
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {!selected.is_active && (
            <Button
              size="sm"
              disabled={openingId === selected.id}
              onClick={() => void handleOpen(selected)}
            >
              <CheckIcon className="mr-1.5 size-3.5" />
              {openingId === selected.id ? "Opening…" : "Open location"}
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => openEdit(selected)}>
            <PencilIcon className="mr-1.5 size-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            style={{ color: "var(--bad)" }}
            disabled={deletingId === selected.id}
            onClick={() => void handleDelete(selected)}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {!selected.address_en && !selected.address_th && !selected.phone && !selected.vat_number && !selected.external_id && !selected.google_maps_url && !selected.google_sheet_id && !selected.notes && (
          <p style={{ fontSize: 13, color: "var(--fg-4)", padding: "16px 0", textAlign: "center" }}>
            No information added yet. Click Edit to fill in the details.
          </p>
        )}

        <InfoRow icon={PhoneIcon} label="Phone" value={selected.phone} />
        <InfoRow icon={ReceiptIcon} label="VAT number" value={selected.vat_number} />
        <InfoRow icon={LinkIcon} label="GBP Location ID" value={selected.external_id} />
        <InfoRow icon={MapPinIcon} label="Address (English)" value={selected.address_en} multiline />
        <InfoRow icon={MapPinIcon} label="Address (Thai)" value={selected.address_th} multiline />
        {selected.google_maps_url && (
          <div style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
            <GlobeIcon style={{ width: 16, height: 16, color: "var(--fg-4)", marginTop: 2, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 11, color: "var(--fg-4)", marginBottom: 2 }}>Google Maps</p>
              <a
                href={selected.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: "var(--bronze)", wordBreak: "break-all" }}
              >
                Open in Maps
              </a>
            </div>
          </div>
        )}
        <InfoRow icon={FileTextIcon} label="Accounting Sheet ID" value={selected.google_sheet_id} />
        <InfoRow icon={FileTextIcon} label="Notes" value={selected.notes} multiline />

        <div style={{ paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
            <UsersIcon style={{ width: 16, height: 16, color: "var(--fg-4)", flexShrink: 0 }} />
            <span className="eyebrow" style={{ color: "var(--fg-4)" }}>Current staff ({locationStaff.length})</span>
          </div>
          {locationStaff.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--fg-4)", paddingLeft: 24 }}>
              No active employees assigned to this location.
            </p>
          ) : (
            <ul style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 6, listStyle: "none", margin: 0 }}>
              {locationStaff.map((emp) => (
                <li key={emp.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <span style={{ fontWeight: 500, color: "var(--fg)" }}>{emp.first_name} {emp.last_name}</span>
                  {emp.position && <span style={{ color: "var(--fg-4)", fontSize: 12 }}>— {emp.position}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  const emptyPanel = !selected && !isAdding && (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, color: "var(--fg-4)" }}>
      <BuildingIcon style={{ width: 32, height: 32, opacity: 0.3 }} />
      <p style={{ fontSize: 13 }}>Select a location to view details</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: "var(--fg)" }}>Locations</h1>
        <Button size="sm" variant="secondary" onClick={openAdd}>
          <PlusIcon className="mr-1.5 size-3.5" />
          Add location
        </Button>
      </div>

      <div style={{ display: "flex", gap: 16, minHeight: 500 }}>
        {/* Left: location list */}
        <div style={{ width: 192, flexShrink: 0, borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {locations.length === 0 ? (
            <p style={{ padding: 16, fontSize: 13, color: "var(--fg-4)", textAlign: "center" }}>No locations yet.</p>
          ) : (
            <ul style={{ overflowY: "auto", flex: 1, listStyle: "none", margin: 0, padding: 0 }}>
              {locations.map((loc) => (
                <LocationListItem
                  key={loc.id}
                  loc={loc}
                  active={selectedId === loc.id && !isAdding}
                  onClick={() => { setSelectedId(loc.id); setIsAdding(false); setIsEditing(false); }}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Right: detail / form panel */}
        <div style={{ flex: 1, borderRadius: "var(--r-lg)", border: "1px solid var(--line)", padding: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {(isAdding || isEditing) && formPanel}
          {detailPanel}
          {emptyPanel}
        </div>
      </div>
    </div>
  );
}
