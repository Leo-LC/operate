"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, TrashIcon, EyeIcon, EyeOffIcon, CopyIcon, CheckIcon } from "lucide-react";
import type { AdminUser, AdminLocation } from "@/modules/admin/types";
import type { ModuleKey } from "@/core/permissions/types";

const ALL_MODULES: ModuleKey[] = [
  "reviews", "documents", "animals", "schedules", "accounting", "reports", "contacts", "wiki", "brand",
];

const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
  { value: "reviewer", label: "Reviewer (Reviews only)" },
];

interface UserDetailClientProps {
  user: AdminUser;
  allLocations: AdminLocation[];
}

export function UserDetailClient({ user: initialUser, allLocations }: UserDetailClientProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [savingRole, setSavingRole] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showAssignedPassword, setShowAssignedPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
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

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword) return;
    setSavingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to set password");
        return;
      }
      const updated = await res.json() as AdminUser;
      setUser((prev) => ({
        ...prev,
        has_password: updated.has_password,
        assigned_password: updated.assigned_password,
      }));
      setNewPassword("");
      toast.success("Password updated");
    } finally {
      setSavingPassword(false);
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

  async function handleCopyPassword() {
    if (!user.assigned_password) return;
    try {
      await navigator.clipboard.writeText(user.assigned_password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      toast.error("Failed to copy password");
    }
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
      router.push("/admin/users");
    } finally {
      setDeleting(false);
    }
  }

  const grantedModuleKeys = new Set(user.module_access.map((m) => m.module_key));
  const grantedLocationIds = new Set(user.location_access.map((la) => la.location_id));
  const hasFullAccess = user.global_role === "owner" || user.global_role === "admin";
  const isReviewerLocked = user.global_role === "reviewer";

  const selectSm: React.CSSProperties = {
    height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line-strong)",
    background: "var(--bg)", color: "var(--fg)", padding: "0 8px", fontSize: 13, outline: "none",
  };
  const sectionStyle: React.CSSProperties = {
    borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
    background: "var(--surface)", padding: 16,
    display: "flex", flexDirection: "column", gap: 12,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/users")} style={{ color: "var(--fg-4)", gap: 6 }}>
            <ArrowLeftIcon className="size-4" />
            Users
          </Button>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: "var(--fg)" }}>{user.email}</h1>
        </div>
        <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)} style={{ gap: 6 }}>
          <TrashIcon className="size-3.5" />
          Delete user
        </Button>
      </div>

      {/* Role */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>Global Role</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select value={user.global_role} onChange={(e) => void handleRoleChange(e.target.value)} disabled={savingRole} style={selectSm}>
            {ROLE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {savingRole && <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Saving…</span>}
        </div>
      </section>

      {/* Password */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>Password</h2>

        {user.assigned_password ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="eyebrow" style={{ color: "var(--fg-3)", fontSize: 10 }}>Assigned password</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <code
                style={{
                  ...selectSm,
                  width: 220,
                  padding: "0 10px",
                  fontFamily: "var(--font-mono, monospace)",
                  letterSpacing: "0.02em",
                }}
              >
                {showAssignedPassword ? user.assigned_password : "••••••••"}
              </code>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowAssignedPassword((v) => !v)}
                style={{ gap: 6 }}
              >
                {showAssignedPassword ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
                {showAssignedPassword ? "Hide" : "Show"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void handleCopyPassword()}
                style={{ gap: 6 }}
              >
                {copiedPassword ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                {copiedPassword ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : user.has_password ? (
          <p style={{ fontSize: 12, color: "var(--fg-4)" }}>
            A password is set, but it was assigned before password tracking was enabled. Set a new password below to store it for future viewing.
          </p>
        ) : (
          <p style={{ fontSize: 12, color: "var(--fg-4)" }}>No password assigned yet.</p>
        )}

        <form onSubmit={(e) => void handleSetPassword(e)} style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="eyebrow" style={{ color: "var(--fg-3)", fontSize: 10 }}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
              style={{ ...selectSm, width: 220, padding: "0 10px" }}
            />
          </div>
          <Button type="submit" size="sm" disabled={savingPassword || !newPassword}>
            {savingPassword ? "Saving…" : "Set password"}
          </Button>
        </form>
      </section>

      {hasFullAccess && (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--bronze)", background: "var(--bronze-soft)", padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ marginTop: 2, display: "inline-flex", width: 20, height: 20, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "var(--r-pill)", background: "var(--bronze)", color: "var(--surface)", fontSize: 10, fontWeight: 700 }}>✓</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>Full access granted</p>
            <p style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2 }}>
              {user.global_role === "owner" ? "Owner" : "Admin"} role gives full access to all modules and locations automatically — no per-module or per-location grants needed.
            </p>
          </div>
        </div>
      )}

      {isReviewerLocked && (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line-strong)", background: "var(--bg-2)", padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ marginTop: 2, display: "inline-flex", width: 20, height: 20, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "var(--r-pill)", background: "var(--line-strong)", color: "var(--surface)", fontSize: 10, fontWeight: 700 }}>i</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>Locked to Reviews</p>
            <p style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2 }}>
              Reviewer role grants read+write access to the Reviews module only — no other module access is possible for this role.
            </p>
          </div>
        </div>
      )}

      {/* Module access */}
      <section style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>Module Access</h2>
          {(hasFullAccess || isReviewerLocked) && <span style={{ fontSize: 10, color: "var(--fg-4)", fontStyle: "italic" }}>Overridden by role</span>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ALL_MODULES.map((mod) => {
            const granted = hasFullAccess || (isReviewerLocked ? mod === "reviews" : grantedModuleKeys.has(mod));
            const locked = hasFullAccess || isReviewerLocked;
            return (
              <label
                key={mod}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  borderRadius: "var(--r-sm)",
                  border: `1px solid ${granted ? "var(--bronze)" : "var(--line)"}`,
                  padding: "4px 12px", fontSize: 12, fontWeight: 500, cursor: locked ? "default" : "pointer",
                  background: granted ? "var(--bronze-soft)" : "var(--bg)",
                  color: granted ? "var(--bronze)" : "var(--fg-4)",
                  opacity: locked ? 0.6 : 1,
                  transition: "all 150ms",
                }}
              >
                <input type="checkbox" className="sr-only" checked={granted} disabled={locked}
                  onChange={() => !locked && (granted ? void handleRevokeModule(mod) : void handleGrantModule(mod, true))} />
                {mod}
              </label>
            );
          })}
        </div>
      </section>

      {/* Location access */}
      <section style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>Location Access</h2>
          {hasFullAccess && <span style={{ fontSize: 10, color: "var(--fg-4)", fontStyle: "italic" }}>Overridden by role</span>}
        </div>
        {allLocations.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--fg-4)" }}>No locations available.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {allLocations.map((loc) => {
              const granted = hasFullAccess || grantedLocationIds.has(loc.id);
              return (
                <label
                  key={loc.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    borderRadius: "var(--r-sm)",
                    border: `1px solid ${granted ? "var(--bronze)" : "var(--line)"}`,
                    padding: "4px 12px", fontSize: 12, fontWeight: 500, cursor: hasFullAccess ? "default" : "pointer",
                    background: granted ? "var(--bronze-soft)" : "var(--bg)",
                    color: granted ? "var(--bronze)" : "var(--fg-4)",
                    opacity: hasFullAccess ? 0.6 : 1,
                    transition: "all 150ms",
                  }}
                >
                  <input type="checkbox" className="sr-only" checked={granted} disabled={hasFullAccess}
                    onChange={() => !hasFullAccess && (granted ? void handleRevokeLocation(loc.id) : void handleGrantLocation(loc.id))} />
                  {loc.name}
                </label>
              );
            })}
          </div>
        )}
      </section>

      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(43,35,27,0.55)", backdropFilter: "blur(2px)", padding: "0 16px" }}>
          <div style={{ width: "100%", maxWidth: 400, borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 24, boxShadow: "var(--shadow-2)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>Delete user</h2>
            <p style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 20 }}>
              Permanently delete <strong style={{ color: "var(--fg)" }}>{user.email}</strong>? This cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => void handleDelete()} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
