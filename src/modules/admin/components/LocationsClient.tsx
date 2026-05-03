"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlusIcon, PencilIcon, Trash2Icon, CheckIcon, XIcon } from "lucide-react";
import type { AdminLocation } from "@/modules/admin/types";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface LocationsClientProps {
  initialLocations: AdminLocation[];
}

export function LocationsClient({ initialLocations }: LocationsClientProps) {
  const router = useRouter();
  const [locations, setLocations] = useState(initialLocations);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSlug, setAddSlug] = useState("");
  const [addExternalId, setAddExternalId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editExternalId, setEditExternalId] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleAddNameChange(value: string) {
    setAddName(value);
    setAddSlug(slugify(value));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim() || !addSlug.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), slug: addSlug.trim(), external_id: addExternalId.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create location");
      }
      const created: AdminLocation = await res.json();
      setLocations((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAdd(false);
      setAddName("");
      setAddSlug("");
      setAddExternalId("");
      toast.success(`Location "${created.name}" created`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(loc: AdminLocation) {
    setEditingId(loc.id);
    setEditName(loc.name);
    setEditExternalId(loc.external_id ?? "");
  }

  async function handleSaveEdit(loc: AdminLocation) {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/admin/locations/${loc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), external_id: editExternalId.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update");
      }
      const updated: AdminLocation = await res.json();
      setLocations((prev) =>
        prev.map((l) => (l.id === updated.id ? updated : l)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      toast.success("Location updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleDelete(loc: AdminLocation) {
    setDeletingId(loc.id);
    try {
      const res = await fetch(`/api/admin/locations/${loc.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete");
      }
      setLocations((prev) => prev.filter((l) => l.id !== loc.id));
      toast.success(`Location "${loc.name}" deleted`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Locations</h1>
        <Button size="sm" variant="outline" onClick={() => setShowAdd((v) => !v)}>
          <PlusIcon className="mr-1.5 size-3.5" />
          Add location
        </Button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="rounded-lg border border-border bg-muted/20 p-4 space-y-3"
        >
          <p className="text-sm font-medium">New location</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name *</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={addName}
                onChange={(e) => handleAddNameChange(e.target.value)}
                placeholder="Branch name"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Slug *</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={addSlug}
                onChange={(e) => setAddSlug(e.target.value)}
                placeholder="branch-name"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">External ID</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={addExternalId}
                onChange={(e) => setAddExternalId(e.target.value)}
                placeholder="e.g. locations/1234…"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => { setShowAdd(false); setAddName(""); setAddSlug(""); setAddExternalId(""); }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Slug</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">External ID</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {locations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No locations yet.
                </td>
              </tr>
            )}
            {locations.map((loc) => {
              const isEditing = editingId === loc.id;
              const isDeleting = deletingId === loc.id;
              return (
                <tr key={loc.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium">
                    {isEditing ? (
                      <input
                        className="rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      loc.name
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{loc.slug}</td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">
                    {isEditing ? (
                      <input
                        className="rounded border border-border bg-background px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        value={editExternalId}
                        onChange={(e) => setEditExternalId(e.target.value)}
                        placeholder="locations/…"
                      />
                    ) : (
                      loc.external_id ?? <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        loc.is_active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {loc.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(loc)}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                            title="Save"
                          >
                            <CheckIcon className="size-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                            title="Cancel"
                          >
                            <XIcon className="size-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(loc)}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                            title="Edit"
                          >
                            <PencilIcon className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(loc)}
                            disabled={isDeleting}
                            className="rounded p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2Icon className="size-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
