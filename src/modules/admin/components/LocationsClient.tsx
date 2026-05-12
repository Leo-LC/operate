"use client";

import { useState } from "react";
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
  address_en: "",
  address_th: "",
  phone: "",
  vat_number: "",
  google_maps_url: "",
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
    <div className="flex gap-3 py-2.5 border-b border-border/50 last:border-0">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        {multiline ? (
          <p className="text-sm whitespace-pre-wrap break-words">{value}</p>
        ) : (
          <p className="text-sm break-words">{value}</p>
        )}
      </div>
    </div>
  );
}

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
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {multiline ? (
        <textarea
          name={name}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <input
          name={name}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
      )}
    </div>
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
      address_en: loc.address_en ?? "",
      address_th: loc.address_th ?? "",
      phone: loc.phone ?? "",
      vat_number: loc.vat_number ?? "",
      google_maps_url: loc.google_maps_url ?? "",
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
          address_en: form.address_en.trim() || null,
          address_th: form.address_th.trim() || null,
          phone: form.phone.trim() || null,
          vat_number: form.vat_number.trim() || null,
          google_maps_url: form.google_maps_url.trim() || null,
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
          address_en: form.address_en.trim() || null,
          address_th: form.address_th.trim() || null,
          phone: form.phone.trim() || null,
          vat_number: form.vat_number.trim() || null,
          google_maps_url: form.google_maps_url.trim() || null,
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

  const formPanel = (
    <form
      onSubmit={isAdding ? handleAdd : handleSaveEdit}
      className="flex flex-col gap-4 h-full"
    >
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <h2 className="text-sm font-semibold">
          {isAdding ? "New location" : `Edit — ${selected?.name}`}
        </h2>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={submitting}>
            <CheckIcon className="mr-1.5 size-3.5" />
            {submitting ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAdding(false);
              setIsEditing(false);
            }}
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="space-y-3 overflow-y-auto flex-1">
        <FormField
          label="Name"
          name="name"
          value={form.name}
          onChange={(v) => setField("name", v)}
          placeholder="Branch name"
          required
        />
        <div className="grid grid-cols-2 gap-3">
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
          label="Google Maps URL"
          name="google_maps_url"
          value={form.google_maps_url}
          onChange={(v) => setField("google_maps_url", v)}
          placeholder="https://maps.google.com/…"
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
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-start justify-between pb-2 border-b border-border">
        <div>
          <h2 className="text-base font-semibold">{selected.name}</h2>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openEdit(selected)}
          >
            <PencilIcon className="mr-1.5 size-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={deletingId === selected.id}
            onClick={() => handleDelete(selected)}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 space-y-1">
        {!selected.address_en &&
          !selected.address_th &&
          !selected.phone &&
          !selected.vat_number &&
          !selected.google_maps_url &&
          !selected.notes && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No information added yet. Click Edit to fill in the details.
            </p>
          )}

        <InfoRow
          icon={PhoneIcon}
          label="Phone"
          value={selected.phone}
        />
        <InfoRow
          icon={ReceiptIcon}
          label="VAT number"
          value={selected.vat_number}
        />
        <InfoRow
          icon={MapPinIcon}
          label="Address (English)"
          value={selected.address_en}
          multiline
        />
        <InfoRow
          icon={MapPinIcon}
          label="Address (Thai)"
          value={selected.address_th}
          multiline
        />
        {selected.google_maps_url && (
          <div className="flex gap-3 py-2.5 border-b border-border/50">
            <GlobeIcon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground mb-0.5">Google Maps</p>
              <a
                href={selected.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline break-all"
              >
                Open in Maps
              </a>
            </div>
          </div>
        )}
        <InfoRow
          icon={FileTextIcon}
          label="Notes"
          value={selected.notes}
          multiline
        />

        {/* Staff section */}
        <div className="pt-2">
          <div className="flex items-center gap-2 py-2.5">
            <UsersIcon className="size-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Current staff ({locationStaff.length})
            </span>
          </div>
          {locationStaff.length === 0 ? (
            <p className="text-sm text-muted-foreground pl-7">
              No active employees assigned to this location.
            </p>
          ) : (
            <ul className="pl-7 space-y-1.5">
              {locationStaff.map((emp) => (
                <li key={emp.id} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {emp.first_name} {emp.last_name}
                  </span>
                  {emp.position && (
                    <span className="text-muted-foreground text-xs">
                      — {emp.position}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  const emptyPanel = !selected && !isAdding && (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
      <BuildingIcon className="size-8 opacity-30" />
      <p className="text-sm">Select a location to view details</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Locations</h1>
        <Button size="sm" variant="outline" onClick={openAdd}>
          <PlusIcon className="mr-1.5 size-3.5" />
          Add location
        </Button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0" style={{ minHeight: "500px" }}>
        {/* Left: location list */}
        <div className="w-48 shrink-0 rounded-lg border border-border overflow-hidden flex flex-col">
          {locations.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              No locations yet.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-y-auto flex-1">
              {locations.map((loc) => (
                <li key={loc.id}>
                  <button
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                      selectedId === loc.id && !isAdding
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/40 text-foreground"
                    }`}
                    onClick={() => {
                      setSelectedId(loc.id);
                      setIsAdding(false);
                      setIsEditing(false);
                    }}
                  >
                    {loc.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: detail / form panel */}
        <div className="flex-1 rounded-lg border border-border p-5 overflow-hidden flex flex-col">
          {(isAdding || isEditing) && formPanel}
          {detailPanel}
          {emptyPanel}
        </div>
      </div>
    </div>
  );
}
