"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlusIcon, ChevronRightIcon } from "lucide-react";
import type { AdminUser } from "@/modules/admin/types";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

const ALL_MODULES = [
  { key: "reviews", label: "Reviews" },
  { key: "documents", label: "Documents" },
  { key: "animals", label: "Animals" },
  { key: "schedules", label: "Scheduling" },
  { key: "accounting", label: "Accounting" },
  { key: "reports", label: "Reports" },
  { key: "contacts", label: "Contacts" },
] as const;

interface LocationOption { id: string; name: string }

interface UsersListClientProps {
  initialUsers: AdminUser[];
  allLocations?: LocationOption[];
}

export function UsersListClient({ initialUsers, allLocations = [] }: UsersListClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json() as AdminUser[];
      if (Array.isArray(data)) setUsers(data);
    }
  }, []);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);
  const [showForm, setShowForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "admin" | "member">("member");
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  function toggleModule(key: string) {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleLocation(id: string) {
    setSelectedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function resetForm() {
    setInviteEmail("");
    setInviteName("");
    setInviteRole("member");
    setSelectedModules(new Set());
    setSelectedLocations(new Set());
    setShowForm(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, name: inviteName || undefined, global_role: inviteRole }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to add user");
        return;
      }
      const newUser = await res.json() as AdminUser;

      // Grant module access
      await Promise.all(Array.from(selectedModules).map((module_key) =>
        fetch(`/api/admin/users/${newUser.id}/modules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module_key, can_read: true, can_write: true }),
        })
      ));

      // Grant location access
      await Promise.all(Array.from(selectedLocations).map((location_id) =>
        fetch(`/api/admin/users/${newUser.id}/locations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location_id }),
        })
      ));

      resetForm();
      await fetchUsers();
      router.refresh();
      toast.success("User added");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Users</h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)} className="gap-1.5">
          <PlusIcon className="size-4" />
          Add user
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="rounded-lg border border-border bg-muted/20 p-5 flex flex-col gap-5"
        >
          {/* Basic info */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Account</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground">Email <span className="text-destructive">*</span></label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  placeholder="user@example.com"
                />
              </div>
              <div className="flex flex-col gap-1 min-w-[160px]">
                <label className="text-xs font-medium text-muted-foreground">Name (optional)</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  placeholder="Full name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "owner" | "admin" | "member")}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </div>
          </div>

          {/* Module access */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Module access</p>
            <div className="flex flex-wrap gap-2">
              {ALL_MODULES.map((m) => (
                <label
                  key={m.key}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                    selectedModules.has(m.key)
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedModules.has(m.key)}
                    onChange={() => toggleModule(m.key)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          {/* Location access */}
          {allLocations.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Location access</p>
              <div className="flex flex-wrap gap-2">
                {allLocations.map((loc) => (
                  <label
                    key={loc.id}
                    className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                      selectedLocations.has(loc.id)
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedLocations.has(loc.id)}
                      onChange={() => toggleLocation(loc.id)}
                    />
                    {loc.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Adding…" : "Add user"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Modules</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Locations</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
              >
                <td className="px-4 py-2.5">{user.email}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{user.name ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {ROLE_LABELS[user.global_role] ?? user.global_role}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">
                  {user.module_access.length > 0
                    ? user.module_access.map((m) => m.module_key).join(", ")
                    : <span className="text-muted-foreground/50">none</span>}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">
                  {user.location_access.length > 0
                    ? `${user.location_access.length} location${user.location_access.length === 1 ? "" : "s"}`
                    : <span className="text-muted-foreground/50">none</span>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <ChevronRightIcon className="size-4 text-muted-foreground inline" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No users yet.</div>
        )}
      </div>
    </div>
  );
}
