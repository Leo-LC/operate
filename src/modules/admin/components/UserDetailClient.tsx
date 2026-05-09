"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, TrashIcon } from "lucide-react";
import type { AdminUser, AdminLocation } from "@/modules/admin/types";
import type { ModuleKey } from "@/core/permissions/types";

const ALL_MODULES: ModuleKey[] = [
  "reviews", "documents", "animals", "schedules", "accounting", "reports", "admin",
];

const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
];

interface UserDetailClientProps {
  user: AdminUser;
  allLocations: AdminLocation[];
}

export function UserDetailClient({ user: initialUser, allLocations }: UserDetailClientProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [savingRole, setSavingRole] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleRoleChange(newRole: string) {
    setSavingRole(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ global_role: newRole }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Update failed");
        return;
      }
      const updated = await res.json() as AdminUser;
      setUser((prev) => ({ ...prev, global_role: updated.global_role }));
      toast.success("Role updated");
    } finally {
      setSavingRole(false);
    }
  }

  async function handleGrantModule(moduleKey: ModuleKey, canWrite: boolean) {
    const res = await fetch(`/api/admin/users/${user.id}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module_key: moduleKey, can_read: true, can_write: canWrite }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to grant access");
      return;
    }
    const row = await res.json();
    setUser((prev) => ({
      ...prev,
      module_access: [
        ...prev.module_access.filter((m) => m.module_key !== moduleKey),
        row,
      ],
    }));
    toast.success(`${moduleKey} access granted`);
  }

  async function handleRevokeModule(moduleKey: ModuleKey) {
    const res = await fetch(`/api/admin/users/${user.id}/modules`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module_key: moduleKey }),
    });
    if (!res.ok) {
      toast.error("Failed to revoke access");
      return;
    }
    setUser((prev) => ({
      ...prev,
      module_access: prev.module_access.filter((m) => m.module_key !== moduleKey),
    }));
    toast.success(`${moduleKey} access revoked`);
  }

  async function handleGrantLocation(locationId: string) {
    const res = await fetch(`/api/admin/users/${user.id}/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: locationId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to grant location access");
      return;
    }
    const loc = allLocations.find((l) => l.id === locationId);
    const row = await res.json();
    setUser((prev) => ({
      ...prev,
      location_access: [
        ...prev.location_access,
        { id: row.id, location_id: locationId, location_name: loc?.name ?? locationId, granted_at: row.granted_at },
      ],
    }));
    toast.success(`Location access granted`);
  }

  async function handleRevokeLocation(locationId: string) {
    const res = await fetch(`/api/admin/users/${user.id}/locations`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: locationId }),
    });
    if (!res.ok) {
      toast.error("Failed to revoke location access");
      return;
    }
    setUser((prev) => ({
      ...prev,
      location_access: prev.location_access.filter((la) => la.location_id !== locationId),
    }));
    toast.success("Location access revoked");
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Delete failed");
        return;
      }
      toast.success("User deleted");
      router.push("/dashboard/admin/users");
    } finally {
      setDeleting(false);
    }
  }

  const grantedModuleKeys = new Set(user.module_access.map((m) => m.module_key));
  const grantedLocationIds = new Set(user.location_access.map((la) => la.location_id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/admin/users")}
            className="gap-1.5 text-muted-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Users
          </Button>
          <h1 className="text-lg font-semibold">{user.email}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive border-destructive/40 hover:bg-destructive/5"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <TrashIcon className="size-3.5" />
          Delete user
        </Button>
      </div>

      {/* Role */}
      <section className="rounded-lg border border-border p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Global Role</h2>
        <div className="flex items-center gap-3">
          <select
            value={user.global_role}
            onChange={(e) => void handleRoleChange(e.target.value)}
            disabled={savingRole}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {ROLE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {savingRole && <span className="text-xs text-muted-foreground">Saving…</span>}
        </div>
      </section>

      {/* Module access */}
      <section className="rounded-lg border border-border p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Module Access</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_MODULES.map((mod) => {
            const granted = grantedModuleKeys.has(mod);
            return (
              <label
                key={mod}
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                  granted
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-border/80"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={granted}
                  onChange={() => granted ? void handleRevokeModule(mod) : void handleGrantModule(mod, true)}
                />
                {mod}
              </label>
            );
          })}
        </div>
      </section>

      {/* Location access */}
      <section className="rounded-lg border border-border p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Location Access</h2>
        {allLocations.length === 0 ? (
          <p className="text-xs text-muted-foreground">No locations available.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allLocations.map((loc) => {
              const granted = grantedLocationIds.has(loc.id);
              return (
                <label
                  key={loc.id}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                    granted
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={granted}
                    onChange={() => granted ? void handleRevokeLocation(loc.id) : void handleGrantLocation(loc.id)}
                  />
                  {loc.name}
                </label>
              );
            })}
          </div>
        )}
      </section>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="text-base font-semibold mb-1">Delete user</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Permanently delete <span className="font-medium text-foreground">{user.email}</span>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void handleDelete()} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
