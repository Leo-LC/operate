"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";

type ApiAccount = {
  key: string;
  label: string;
  source: "db" | "env";
  is_active: boolean;
  has_token: boolean;
  masked: string | null;
  env_fallback: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export function LoyverseAccountsCard() {
  const [accounts, setAccounts] = React.useState<ApiAccount[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [canEdit, setCanEdit] = React.useState(true);
  const [form, setForm] = React.useState({ key: "", label: "", token: "" });
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [editToken, setEditToken] = React.useState<Record<string, string>>({});
  const [storesHint, setStoresHint] = React.useState<{ key: string; stores: { id: string; name: string }[] } | null>(null);

  const fetchAccounts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/loyverse/accounts", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        setError(null);
        setAccounts(null);
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load accounts");
      setAccounts(json.accounts as ApiAccount[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/loyverse/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.status === 403) {
        setCanEdit(false);
        throw new Error("Owner only — ask an owner to add shops.");
      }
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      setStoresHint({ key: json.key, stores: json.stores ?? [] });
      setMsg(`Shop "${json.key}" added and token verified.`);
      setForm({ key: "", label: "", token: "" });
      await fetchAccounts();
    } catch (e2) {
      setMsg(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateToken(key: string) {
    const token = (editToken[key] ?? "").trim();
    if (!token) return;
    setMsg(null);
    try {
      const res = await fetch(`/api/loyverse/accounts/${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      setMsg(`Token updated for "${key}" (verified live).`);
      setEditToken((m) => ({ ...m, [key]: "" }));
      await fetchAccounts();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleToggle(key: string, is_active: boolean) {
    setMsg(null);
    try {
      const res = await fetch(`/api/loyverse/accounts/${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      await fetchAccounts();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(key: string) {
    if (!window.confirm(`Remove shop "${key}" from the DB registry? History is kept.`)) return;
    setMsg(null);
    try {
      const res = await fetch(`/api/loyverse/accounts/${encodeURIComponent(key)}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      setMsg(`Shop "${key}" removed from DB registry.`);
      await fetchAccounts();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  if (!loading && accounts === null && !error) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shops Loyverse (comptes API)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-[var(--fg-4)]">
          Source de vérité : table <code>loyverse_accounts</code> (modifiable ici, sans redeploy).
          Les tokens ne sont jamais affichés — seuls les 4 derniers caractères pour identification.
          Après ajout, mappe chaque store dans <code>locations</code> puis lance une sync.
        </p>

        {loading && <p className="text-sm text-[var(--fg-4)]">Loading…</p>}
        {error && <p className="text-sm text-[var(--bad)]">{error}</p>}

        {accounts && (
          <div className="space-y-2">
            {accounts.map((a) => (
              <div key={a.key} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--line)] p-2">
                <span className="font-medium">{a.label}</span>
                <code className="text-xs text-[var(--fg-4)]">{a.key}</code>
                <Pill size="sm" tone={a.source === "db" ? "info" : "warn"}>
                  {a.source === "db" ? "DB" : "ENV"}
                </Pill>
                {!a.is_active && (
                  <Pill size="sm" tone="neutral">
                    désactivé
                  </Pill>
                )}
                {a.masked && <code className="text-xs text-[var(--fg-4)]">{a.masked}</code>}
                {a.env_fallback && (
                  <span className="text-xs text-[var(--warn)]">env-only — ajoute-le en DB pour le rendre éditable</span>
                )}
                {canEdit && a.source === "db" && (
                  <span className="ml-auto flex items-center gap-1">
                    <input
                      type="password"
                      placeholder="Nouveau token…"
                      value={editToken[a.key] ?? ""}
                      onChange={(e) => setEditToken((m) => ({ ...m, [a.key]: e.target.value }))}
                      className="h-8 w-40 rounded-md border border-[var(--line)] bg-transparent px-2 text-xs"
                    />
                    <Button size="sm" variant="outline" onClick={() => handleUpdateToken(a.key)}>
                      Token
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleToggle(a.key, a.is_active)}>
                      {a.is_active ? "Désactiver" : "Activer"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(a.key)}>
                      Retirer
                    </Button>
                  </span>
                )}
              </div>
            ))}
            {accounts.length === 0 && (
              <p className="text-sm text-[var(--fg-4)]">Aucun compte configuré.</p>
            )}
          </div>
        )}

        {storesHint && storesHint.stores.length > 0 && (
          <div className="rounded-lg border border-[var(--info)]/30 bg-[var(--info-soft)] p-2 text-xs">
            <p className="font-medium">
              Stores détectés pour “{storesHint.key}” — reporte leurs IDs dans `locations` :
            </p>
            <ul className="mt-1 space-y-0.5">
              {storesHint.stores.map((s) => (
                <li key={s.id}>
                  <code>{s.id}</code> — {s.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {canEdit && (
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2 border-t border-[var(--line)] pt-3">
            <label className="grid gap-1 text-xs">
              Key
              <input
                required
                placeholder="pattaya"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toLowerCase() }))}
                pattern="[a-z0-9_-]+"
                className="h-8 w-32 rounded-md border border-[var(--line)] bg-transparent px-2"
              />
            </label>
            <label className="grid gap-1 text-xs">
              Label
              <input
                placeholder="Pattaya"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className="h-8 w-32 rounded-md border border-[var(--line)] bg-transparent px-2"
              />
            </label>
            <label className="grid gap-1 text-xs">
              Token Loyverse
              <input
                required
                type="password"
                placeholder="Token Back Office → Access Tokens"
                value={form.token}
                onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
                className="h-8 w-64 rounded-md border border-[var(--line)] bg-transparent px-2"
              />
            </label>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Vérification…" : "Ajouter + vérifier"}
            </Button>
          </form>
        )}

        {msg && <p className="text-xs text-[var(--fg-3)]">{msg}</p>}
      </CardContent>
    </Card>
  );
}
