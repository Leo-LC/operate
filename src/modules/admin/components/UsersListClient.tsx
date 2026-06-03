"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { PageHeader } from "@/components/ui/page-header";
import { PlusIcon, ChevronRightIcon, Loader2Icon } from "lucide-react";
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
  { key: "wiki", label: "Wiki" },
  { key: "brand", label: "Brand" },
] as const;

const inputStyle: React.CSSProperties = {
  height: 32,
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--line-strong)",
  background: "var(--bg)",
  color: "var(--fg)",
  padding: "0 10px",
  fontSize: 13,
  outline: "none",
};

interface LocationOption { id: string; name: string }

interface UsersListClientProps {
  allLocations?: LocationOption[];
}

export function UsersListClient({ allLocations = [] }: UsersListClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "admin" | "member">("member");
  const [invitePassword, setInvitePassword] = useState("");
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (!res.ok) { toast.error("Failed to load users"); return; }
      const data: unknown = await res.json();
      if (Array.isArray(data)) setUsers(data as AdminUser[]);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

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
    setInvitePassword("");
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
        body: JSON.stringify({ email: inviteEmail, name: inviteName || undefined, global_role: inviteRole, password: invitePassword || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to add user");
        return;
      }
      const newUser = await res.json() as AdminUser;

      await Promise.all(Array.from(selectedModules).map((module_key) =>
        fetch(`/api/admin/users/${newUser.id}/modules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module_key, can_read: true, can_write: true }),
        })
      ));

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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Users"
        actions={
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <PlusIcon className="size-4" />
            Add user
          </Button>
        }
      />

      {showForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--bg-2)", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}
        >
          <div>
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 12 }}>Account</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 200 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Email <span style={{ color: "var(--bad)" }}>*</span></label>
                <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }} placeholder="user@example.com" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Name (optional)</label>
                <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }} placeholder="Full name" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Password (optional)</label>
                <input type="password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }} placeholder="Leave blank to set later" autoComplete="new-password" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-3)" }}>Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "owner" | "admin" | "member")}
                  style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 12 }}>Module access</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ALL_MODULES.map((m) => {
                const checked = selectedModules.has(m.key);
                return (
                  <label key={m.key} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    borderRadius: "var(--r-sm)", border: `1px solid ${checked ? "var(--bronze)" : "var(--line)"}`,
                    padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                    background: checked ? "var(--bronze-soft)" : "var(--bg)",
                    color: checked ? "var(--bronze)" : "var(--fg-3)",
                    transition: "all 150ms",
                  }}>
                    <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleModule(m.key)} />
                    {m.label}
                  </label>
                );
              })}
            </div>
          </div>

          {allLocations.length > 0 && (
            <div>
              <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 12 }}>Location access</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {allLocations.map((loc) => {
                  const checked = selectedLocations.has(loc.id);
                  return (
                    <label key={loc.id} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      borderRadius: "var(--r-sm)", border: `1px solid ${checked ? "var(--bronze)" : "var(--line)"}`,
                      padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                      background: checked ? "var(--bronze-soft)" : "var(--bg)",
                      color: checked ? "var(--bronze)" : "var(--fg-3)",
                      transition: "all 150ms",
                    }}>
                      <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleLocation(loc.id)} />
                      {loc.name}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Adding…" : "Add user"}</Button>
            <Button type="button" size="sm" variant="secondary" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0", fontSize: 13, color: "var(--fg-4)", gap: 8 }}>
          <Loader2Icon className="size-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--bg-2)" }}>
              <tr>
                {["Email", "Name", "Role", "Modules", "Locations", ""].map((h) => (
                  <th key={h} className="eyebrow" style={{ padding: "10px 16px", textAlign: "left", color: "var(--fg-4)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} onClick={() => router.push(`/admin/users/${user.id}`)} />
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "var(--fg-4)" }}>No users yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

function UserRow({ user, onClick }: { user: AdminUser; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      style={{ background: hovered ? "var(--row-hover)" : "var(--surface)", borderTop: "1px solid var(--line)", cursor: "pointer" }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={{ padding: "10px 16px", color: "var(--fg)" }}>{user.email}</td>
      <td style={{ padding: "10px 16px", color: "var(--fg-3)" }}>{user.name ?? "—"}</td>
      <td style={{ padding: "10px 16px" }}>
        <Pill tone="neutral" size="sm">{ROLE_LABELS[user.global_role] ?? user.global_role}</Pill>
      </td>
      <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--fg-3)" }}>
        {user.module_access.length > 0 ? user.module_access.map((m) => m.module_key).join(", ") : <span style={{ color: "var(--fg-4)" }}>none</span>}
      </td>
      <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--fg-3)" }}>
        {user.location_access.length > 0 ? `${user.location_access.length} location${user.location_access.length === 1 ? "" : "s"}` : <span style={{ color: "var(--fg-4)" }}>none</span>}
      </td>
      <td style={{ padding: "10px 16px", textAlign: "right" }}>
        <ChevronRightIcon className="size-4 inline" style={{ color: "var(--fg-4)" }} />
      </td>
    </tr>
  );
}
