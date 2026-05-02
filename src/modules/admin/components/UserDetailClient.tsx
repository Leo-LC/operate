"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, TrashIcon, PlusIcon } from "lucide-react";
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

  const grantedModuleKeys = new Set(user.module_access.map((m) => m.module_key));
  const grantedLocationIds = new Set(user.location_access.map((la) => la.location_id));
  const availableModules = ALL_MODULES.filter((m) => !grantedModuleKeys.has(m));
  const availableLocations = allLocations.filter((l) => !grantedLocationIds.has(l.id));

  return (
    <div className="flex flex-col gap-6">
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
        {user.module_access.length === 0 ? (
          <p className="text-xs text-muted-foreground">No module access granted.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {user.module_access.map((m) => (
              <div
                key={m.module_key}
                className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1"
              >
                <span className="text-xs font-medium">{m.module_key}</span>
                <span className="text-[10px] text-muted-foreground">
                  {m.can_write ? "rw" : "r"}
                </span>
                <button
                  onClick={() => void handleRevokeModule(m.module_key as ModuleKey)}
                  className="ml-0.5 text-muted-foreground/60 hover:text-destructive transition-colors"
                  aria-label={`Revoke ${m.module_key}`}
                >
                  <TrashIcon className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {availableModules.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {availableModules.map((mod) => (
              <button
                key={mod}
                onClick={() => void handleGrantModule(mod, false)}
                className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
              >
                <PlusIcon className="size-3" />
                {mod}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Location access */}
      <section className="rounded-lg border border-border p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Location Access</h2>
        {user.location_access.length === 0 ? (
          <p className="text-xs text-muted-foreground">No location access granted.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {user.location_access.map((la) => (
              <div
                key={la.location_id}
                className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1"
              >
                <span className="text-xs font-medium">{la.location_name}</span>
                <button
                  onClick={() => void handleRevokeLocation(la.location_id)}
                  className="ml-0.5 text-muted-foreground/60 hover:text-destructive transition-colors"
                  aria-label={`Revoke ${la.location_name}`}
                >
                  <TrashIcon className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {availableLocations.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {availableLocations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => void handleGrantLocation(loc.id)}
                className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
              >
                <PlusIcon className="size-3" />
                {loc.name}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
