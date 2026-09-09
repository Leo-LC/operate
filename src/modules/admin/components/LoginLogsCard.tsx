"use client";

import { useEffect, useState } from "react";

interface LoginLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  provider: string | null;
  role: string | null;
  created_at: string;
}

export function LoginLogsCard() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/login-logs?limit=20", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLogs(data as LoginLog[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>Connexions récentes</h3>
        <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{logs.length} entrées</span>
      </div>
      {loading ? (
        <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--fg-4)" }}>Chargement…</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--fg-4)" }}>Aucune connexion enregistrée.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--fg-4)", fontWeight: 500, fontSize: 11 }}>Heure</th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--fg-4)", fontWeight: 500, fontSize: 11 }}>Utilisateur</th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--fg-4)", fontWeight: 500, fontSize: 11 }}>Méthode</th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--fg-4)", fontWeight: 500, fontSize: 11 }}>Rôle</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderTop: "1px solid var(--line-2)" }}>
                  <td className="mono" style={{ padding: "8px 12px", color: "var(--fg-4)", whiteSpace: "nowrap", fontSize: 11 }}>
                    {new Date(log.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "8px 12px", color: "var(--fg)", fontSize: 12 }}>{log.user_email ?? "—"}</td>
                  <td style={{ padding: "8px 12px", color: "var(--fg-3)", fontSize: 11 }}>{log.provider ?? "—"}</td>
                  <td style={{ padding: "8px 12px", color: "var(--fg-3)", fontSize: 11, textTransform: "capitalize" }}>{log.role ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
