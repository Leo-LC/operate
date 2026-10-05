"use client";

import { useMemo } from "react";
import type { ActivityRow } from "@/app/api/admin/activity/route";

function bangkokToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function bangkokDays(count: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d),
    );
  }
  return out;
}

function bangkokTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function shortName(email: string | null): string {
  if (!email) return "Quelqu'un";
  const local = email.split("@")[0];
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function level(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 2) return 2;
  if (count <= 3) return 3;
  return 4;
}

const OPACITIES = ["", "0.25", "0.45", "0.7", "1"];

export function ActivityClient({ rows }: { rows: ActivityRow[] }) {
  const today = bangkokToday();
  const days = useMemo(() => bangkokDays(30), []);

  const todayRows = useMemo(
    () =>
      rows
        .filter((r) => r.visited_on === today)
        .sort((a, b) => +new Date(b.last_seen_at) - +new Date(a.last_seen_at)),
    [rows, today],
  );

  const { users, perUserDay } = useMemo(() => {
    const seen = new Map<string, { email: string; last: string }>();
    const grid = new Map<string, Map<string, Set<string>>>();
    for (const r of rows) {
      const key = r.user_email ?? r.user_id ?? "?";
      const prev = seen.get(key);
      if (!prev || r.last_seen_at > prev.last) {
        seen.set(key, { email: r.user_email ?? "—", last: r.last_seen_at });
      }
      let byDay = grid.get(key);
      if (!byDay) {
        byDay = new Map();
        grid.set(key, byDay);
      }
      let mods = byDay.get(r.visited_on);
      if (!mods) {
        mods = new Set();
        byDay.set(r.visited_on, mods);
      }
      mods.add(r.module_key);
    }
    const ordered = Array.from(seen.entries()).sort((a, b) => (a[1].last < b[1].last ? 1 : -1));
    return { users: ordered, perUserDay: grid };
  }, [rows]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Aujourd'hui ── */}
      <section
        style={{
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--line)",
          background: "var(--surface)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--line)",
            background: "var(--bg-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
            Aujourd&apos;hui — qui est passé ?
          </h3>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>
            {todayRows.length} visite{todayRows.length > 1 ? "s" : ""} · {new Set(todayRows.map((r) => r.user_email)).size} personne(s)
          </span>
        </div>
        {todayRows.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--fg-4)" }}>
            Personne n&apos;a encore visité de module aujourd&apos;hui.
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {todayRows.map((r) => (
              <li
                key={r.id}
                style={{
                  padding: "9px 16px",
                  borderTop: "1px solid var(--line-2)",
                  fontSize: 13,
                  color: "var(--fg-3)",
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                <strong style={{ color: "var(--fg)", fontWeight: 600 }}>
                  {shortName(r.user_email)}
                </strong>
                <span>a visité le module</span>
                <span
                  className="mono"
                  style={{
                    fontSize: 12,
                    background: "var(--bg-2)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-sm)",
                    padding: "0 6px",
                    color: "var(--fg)",
                  }}
                >
                  {r.module_key}
                </span>
                <span>
                  aujourd&apos;hui à <span className="mono">{bangkokTime(r.last_seen_at)}</span>
                  {r.visit_count > 1 && (
                    <span style={{ color: "var(--fg-4)" }}> ({r.visit_count} passages)</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Grille 30 jours ── */}
      <section
        style={{
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--line)",
          background: "var(--surface)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--line)",
            background: "var(--bg-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
            Activité — 30 derniers jours
          </h3>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>
            1 carré = 1 jour · intensité = nb de modules visités
          </span>
        </div>
        {users.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--fg-4)" }}>
            Aucune visite enregistrée sur la période. La grille se remplit dès que
            quelqu&apos;un navigue sur le site.
          </div>
        ) : (
          <div style={{ overflowX: "auto", padding: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 640 }}>
              {/* day labels */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 140, flexShrink: 0 }} />
                <div style={{ display: "flex", gap: 4, flex: 1 }}>
                  {days.map((d) => (
                    <div key={d} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "var(--fg-4)" }} className="mono">
                      {d.slice(8)}
                    </div>
                  ))}
                </div>
              </div>
              {users.map(([key, info]) => {
                const byDay = perUserDay.get(key);
                const activeDays = days.filter((d) => (byDay?.get(d)?.size ?? 0) > 0).length;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        width: 140,
                        flexShrink: 0,
                        fontSize: 12,
                        color: "var(--fg)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={info.email}
                    >
                      {shortName(info.email)}
                      <span style={{ marginLeft: 6, fontSize: 10, color: "var(--fg-4)" }} className="mono">
                        {activeDays}j
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 4, flex: 1 }}>
                      {days.map((d) => {
                        const count = byDay?.get(d)?.size ?? 0;
                        const lv = level(count);
                        const mods = Array.from(byDay?.get(d) ?? []).join(", ");
                        return (
                          <div
                            key={d}
                            title={
                              count > 0
                                ? `${shortName(info.email)} — ${d} : ${count} module(s) (${mods})`
                                : `${shortName(info.email)} — ${d} : aucune visite`
                            }
                            style={{
                              flex: 1,
                              aspectRatio: "1",
                              minWidth: 0,
                              borderRadius: 3,
                              border: "1px solid var(--line-2)",
                              background:
                                lv === 0 ? "var(--bg-2)" : `color-mix(in srgb, var(--accent) ${Number(OPACITIES[lv]) * 100}%, transparent)`,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 12, fontSize: 10, color: "var(--fg-4)" }}>
              <span>Moins</span>
              {[0, 1, 2, 3, 4].map((lv) => (
                <div
                  key={lv}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    border: "1px solid var(--line-2)",
                    background:
                      lv === 0 ? "var(--bg-2)" : `color-mix(in srgb, var(--accent) ${Number(OPACITIES[lv]) * 100}%, transparent)`,
                  }}
                />
              ))}
              <span>Plus</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
