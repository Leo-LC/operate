"use client";
import { useState } from "react";
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

interface UsersListClientProps {
  initialUsers: AdminUser[];
}

export function UsersListClient({ initialUsers }: UsersListClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "admin" | "member">("member");
  const [submitting, setSubmitting] = useState(false);

  async function handleInvite(e: React.FormEvent) {
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
      setUsers((prev) => [...prev, { ...newUser, module_access: [], location_access: [] }]);
      setShowInvite(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("member");
      toast.success("User added");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Users</h1>
        <Button size="sm" onClick={() => setShowInvite((v) => !v)} className="gap-1.5">
          <PlusIcon className="size-4" />
          Add user
        </Button>
      </div>

      {showInvite && (
        <form
          onSubmit={(e) => void handleInvite(e)}
          className="rounded-lg border border-border bg-muted/20 p-4 flex flex-wrap gap-3 items-end"
        >
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
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
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Adding…" : "Add"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowInvite(false)}>
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
