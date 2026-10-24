"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { DateInput } from "@/components/ui/date-input";
import { Stat } from "@/components/ui/stat";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchIcon, SaveIcon, XIcon, Loader2Icon, ChevronDownIcon } from "lucide-react";
import { bangkokToday, previousMonth } from "@/lib/dates";
import { monthRange, searchMatch, NO_LOCATION_KEY, type ItemAggregate } from "../lib/item-analysis";

// ── Types (shape de GET /api/loyverse/item-sales) ─────────────────────────────

type ItemSalesData = {
  from: string;
  to: string;
  items: ItemAggregate[];
  series: Record<string, Record<string, { q: number; m: number }>>;
  dates: string[];
  days_with_rows: string[];
  /** { item_name: [{ p, n, q, m }] } — détail par prix tapé (si backfill/sync fait). */
  prices: Record<string, { p: number; n: number; q: number; m: number }[]>;
  locations: Record<string, string>;
};

type ItemGroup = { id: string; name: string; item_names: string[] };

/** Clé de catégorie côté UI : null → "__none__" (articles hors catalogue). */
function catKey(category_name: string | null): string {
  return category_name ?? "__none__";
}
function catLabel(category_name: string | null): string {
  return category_name ?? "Sans catégorie";
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}
function fmtQty(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(n);
}

const MONTH_LABEL_FMT = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" });
function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return MONTH_LABEL_FMT.format(new Date(Date.UTC(y, m - 1, 15)));
}

/** Les N derniers mois (mois courant inclus), courant d'abord. */
function lastMonths(n: number): string[] {
  const months: string[] = [];
  let cur = bangkokToday().slice(0, 7);
  for (let i = 0; i < n; i++) {
    months.push(cur);
    cur = previousMonth(cur);
  }
  return months;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AnalysisPanel({ canSync = false }: { canSync?: boolean }) {
  // Période : mois précédent par défaut (complet, non touché par un sync tardif)
  const months = React.useMemo(() => lastMonths(7), []);
  const [month, setMonth] = React.useState<string>(() => previousMonth(bangkokToday().slice(0, 7)));
  const [from, setFrom] = React.useState<string>("");
  const [to, setTo] = React.useState<string>("");

  const [data, setData] = React.useState<ItemSalesData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [query, setQuery] = React.useState("");
  const [view, setView] = React.useState<"items" | "daily">("items");

  // Filtre catégories (Set vide = toutes) : clé = catKey(catégorie)
  const [selectedCats, setSelectedCats] = React.useState<Set<string>>(new Set());
  // Liste d'articles : ouverte au focus de la recherche, ou en auto tant qu'une
  // recherche/filtre est actif. listOpen = null (auto) / true / false (chevron
  // ou Échap forcent l'état).
  const selectorRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputFocused, setInputFocused] = React.useState(false);
  const [listOpen, setListOpen] = React.useState<boolean | null>(null);
  // Drill-down "prix tapés" par article (vue Par article)
  const [expandedPrices, setExpandedPrices] = React.useState<Set<string>>(new Set());

  // Groupes sauvegardés
  const [groups, setGroups] = React.useState<ItemGroup[]>([]);
  const [savingGroup, setSavingGroup] = React.useState(false);
  const [groupName, setGroupName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);

  const effectiveFrom = React.useMemo(
    () => (from && to ? from : monthRange(month).first),
    [from, to, month],
  );
  const effectiveTo = React.useMemo(
    () => (from && to ? to : monthRange(month).last),
    [from, to, month],
  );

  const loadSales = React.useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/loyverse/item-sales?from=${effectiveFrom}&to=${effectiveTo}`, { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`);
        setData(json as ItemSalesData);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [effectiveFrom, effectiveTo]);

  const loadGroups = React.useCallback(() => {
    fetch("/api/loyverse/item-groups", { cache: "no-store" })
      .then(async (r) => r.json())
      .then((json) => setGroups(json.groups ?? []))
      .catch(() => setGroups([]));
  }, []);

  React.useEffect(() => {
    loadSales();
  }, [loadSales]);
  React.useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const locationName = React.useCallback(
    (locId: string): string => {
      if (locId === NO_LOCATION_KEY) return "Sans shop";
      return data?.locations[locId] ?? locId.slice(0, 8);
    },
    [data],
  );

  const items = React.useMemo(() => data?.items ?? [], [data]);
  const missingDays = React.useMemo(
    () => (data ? data.dates.filter((d) => !data.days_with_rows.includes(d)) : []),
    [data],
  );

  const catsActive = selectedCats.size > 0;
  const listShown = React.useMemo(
    () => (listOpen ?? (inputFocused || query.trim().length > 0 || catsActive)),
    [listOpen, inputFocused, query, catsActive],
  );

  const filteredItems = React.useMemo(
    () =>
      items.filter(
        (i) => (selectedCats.size === 0 || selectedCats.has(catKey(i.category_name))) && searchMatch(query, i.item_name),
      ),
    [items, query, selectedCats],
  );

  const selectedItems = React.useMemo(
    () => items.filter((i) => selected.has(i.item_name)),
    [items, selected],
  );

  const categories = React.useMemo(() => {
    const map = new Map<string, { key: string; label: string; items_count: number; money: number }>();
    for (const it of items) {
      const key = catKey(it.category_name);
      const cur = map.get(key) ?? { key, label: catLabel(it.category_name), items_count: 0, money: 0 };
      cur.items_count += 1;
      cur.money += it.total_money;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.money - a.money);
  }, [items]);

  // Agrégats de la sélection
  const totals = React.useMemo(() => {
    let money = 0;
    let qty = 0;
    const byLocation = new Map<string, number>();
    const byDay = new Map<string, { q: number; m: number }>();
    for (const it of selectedItems) {
      money += it.total_money;
      qty += it.quantity;
      for (const [loc, m] of Object.entries(it.by_location)) {
        byLocation.set(loc, (byLocation.get(loc) ?? 0) + m);
      }
    }
    for (const it of selectedItems) {
      const days = data?.series[it.item_name] ?? {};
      for (const [d, v] of Object.entries(days)) {
        const cur = byDay.get(d) ?? { q: 0, m: 0 };
        cur.q += v.q;
        cur.m += v.m;
        byDay.set(d, cur);
      }
    }
    const dailySeries = data
      ? data.dates.map((d) => byDay.get(d)?.m ?? 0)
      : [];
    return { money, qty, byLocation, byDay, dailySeries };
  }, [selectedItems, data]);

  function toggleItem(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function applyGroup(group: ItemGroup) {
    setSelected(new Set(group.item_names));
  }

  async function saveGroup() {
    const name = groupName.trim();
    if (!name || selected.size === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/loyverse/item-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, item_names: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setSavingGroup(false);
      setGroupName("");
      loadGroups();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteGroup(group: ItemGroup) {
    if (!window.confirm(`Supprimer le groupe « ${group.name} » ?`)) return;
    try {
      const res = await fetch(`/api/loyverse/item-groups?id=${group.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      loadGroups();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  async function syncMissing() {
    if (missingDays.length === 0) return;
    if (!window.confirm(`Synchroniser les ${Math.min(missingDays.length, 30)} jours manquants ?`)) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/loyverse/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: missingDays.slice(0, 30) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      loadSales();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  }

  // Période custom vs mois prédéfini : dès qu'une plage custom est posée, les pills de mois sont désactivées
  function toggleCat(key: string) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setPresetMonth(m: string) {
    setFrom("");
    setTo("");
    setMonth(m);
  }
  function setPresetDays(days: number) {
    const today = bangkokToday();
    const [y, m, d] = today.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, d - (days - 1))).toISOString().slice(0, 10);
    setMonth("");
    setFrom(start);
    setTo(today);
  }

  const maxDaily = Math.max(...totals.dailySeries, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Période */}
      <Card>
        <CardHeader>
          <CardTitle>Période</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {months.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPresetMonth(m)}
              className={
                m === month
                  ? "rounded-[var(--r-pill)] border border-[var(--line-strong)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]"
                  : "rounded-[var(--r-pill)] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--fg-3)] hover:text-[var(--fg-2)]"
              }
            >
              {monthLabel(m)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPresetDays(7)}
            className="rounded-[var(--r-pill)] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--fg-3)] hover:text-[var(--fg-2)]"
          >
            7j
          </button>
          <button
            type="button"
            onClick={() => setPresetDays(30)}
            className="rounded-[var(--r-pill)] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--fg-3)] hover:text-[var(--fg-2)]"
          >
            30j
          </button>
          <span className="mx-1 h-5 w-px bg-[var(--line)]" />
          <DateInput value={from} onChange={(e) => setFrom((e.target as HTMLInputElement).value)} placeholder="Début" className="w-[130px]" />
          <span className="text-xs text-[var(--fg-4)]">→</span>
          <DateInput value={to} onChange={(e) => setTo((e.target as HTMLInputElement).value)} placeholder="Fin" className="w-[130px]" />
          {missingDays.length > 0 && (
            <span className="ml-auto flex items-center gap-2">
              <Pill tone="warn" size="sm">
                {missingDays.length} jour{missingDays.length > 1 ? "s" : ""} sans données
              </Pill>
              {canSync && (
                <button
                  type="button"
                  onClick={syncMissing}
                  disabled={syncing}
                  className="inline-flex items-center gap-1 rounded-[var(--r-pill)] border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--fg-2)] hover:text-[var(--fg)] disabled:opacity-50"
                >
                  {syncing ? <Loader2Icon style={{ width: 12, height: 12 }} className="animate-spin" /> : null}
                  Synchroniser
                </button>
              )}
            </span>
          )}
        </CardContent>
      </Card>

      {/* Sélection d'articles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Articles</span>
            <span className="text-xs font-normal text-[var(--fg-4)]">
              {selected.size > 0 ? `${selected.size} sélectionné${selected.size > 1 ? "s" : ""} · ฿${fmtMoney(totals.money)} · ${fmtQty(totals.qty)} u.` : "Aucune sélection"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {/* Groupes sauvegardés */}
          {(groups.length > 0 || selected.size > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {groups.map((g) => (
                <span key={g.id} className="group inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => applyGroup(g)}
                    title={g.item_names.join(", ")}
                    className="rounded-l-[var(--r-pill)] border border-r-0 border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--fg-2)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                  >
                    {g.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteGroup(g)}
                    title={`Supprimer ${g.name}`}
                    className="rounded-r-[var(--r-pill)] border border-[var(--line)] bg-[var(--surface-2)] px-1.5 py-1 text-xs text-[var(--fg-4)] hover:text-[var(--bad)]"
                  >
                    <XIcon style={{ width: 11, height: 11 }} />
                  </button>
                </span>
              ))}
              {selected.size > 0 && !savingGroup && (
                <button
                  type="button"
                  onClick={() => setSavingGroup(true)}
                  className="inline-flex items-center gap-1 rounded-[var(--r-pill)] border border-dashed border-[var(--line-strong)] px-2.5 py-1 text-xs text-[var(--fg-3)] hover:text-[var(--fg-2)]"
                >
                  <SaveIcon style={{ width: 12, height: 12 }} /> Sauvegarder la sélection
                </button>
              )}
              {savingGroup && (
                <span className="inline-flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveGroup();
                      if (e.key === "Escape") setSavingGroup(false);
                    }}
                    placeholder="Nom du groupe…"
                    maxLength={80}
                    className="h-[24px] w-[160px] rounded-[var(--r-pill)] border border-[var(--line)] bg-[var(--bg-2)] px-2.5 text-xs outline-none focus:border-[var(--accent)]"
                  />
                  <button type="button" onClick={saveGroup} disabled={saving || !groupName.trim()} className="rounded-[var(--r-pill)] bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent)] disabled:opacity-50">
                    OK
                  </button>
                  <button type="button" onClick={() => setSavingGroup(false)} className="rounded-[var(--r-pill)] border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--fg-3)]">
                    Annuler
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Recherche + liste (repliée quand la recherche n'est pas focus) */}
          <div ref={selectorRef} className="flex flex-col gap-2">
            <div className="relative">
              <SearchIcon
                style={{ width: 14, height: 14, position: "absolute", left: 10, top: 9, color: "var(--fg-4)", pointerEvents: "none" }}
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={(e) => {
                  // Pas de collapse si le focus passe dans la liste (checkbox, pill…)
                  if (e.relatedTarget && selectorRef.current?.contains(e.relatedTarget as Node)) return;
                  setInputFocused(false);
                }}
                onKeyDown={(e) => {
                  // Échap : vide la recherche/filtre et replie la liste
                  if (e.key === "Escape") {
                    setQuery("");
                    setSelectedCats(new Set());
                    setListOpen(false);
                    setInputFocused(false);
                    inputRef.current?.blur();
                  }
                }}
                placeholder='Rechercher… ex. "postcard", "carte post", "iced latte"'
                className="h-9 w-full rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-2)] pl-8 pr-16 text-sm outline-none focus:border-[var(--accent)]"
              />
              {/* Toggle manuel : remporte sur l'auto (focus/recherche) */}
              <button
                type="button"
                onClick={() => setListOpen(!listShown)}
                onMouseDown={(e) => e.preventDefault()}
                className="absolute right-2 top-2 inline-flex items-center gap-0.5 text-[10px] text-[var(--fg-4)] hover:text-[var(--fg-2)]"
                aria-label={listShown ? "Replier la liste" : "Afficher la liste"}
                title={listShown ? "Replier la liste" : "Afficher la liste"}
              >
                {filteredItems.length}{" "}
                <ChevronDownIcon style={{ width: 12, height: 12, transform: listShown ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
              </button>
            </div>

            {listShown && (
              <>
                {/* Filtre catégories */}
                {categories.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-4)]">Catégorie</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCats(new Set())}
                      className={
                        selectedCats.size === 0
                          ? "rounded-[var(--r-pill)] border border-[var(--line-strong)] bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]"
                          : "rounded-[var(--r-pill)] border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--fg-3)] hover:text-[var(--fg-2)]"
                      }
                    >
                      Toutes
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => toggleCat(c.key)}
                        className={
                          selectedCats.has(c.key)
                            ? "rounded-[var(--r-pill)] border border-[var(--line-strong)] bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]"
                            : "rounded-[var(--r-pill)] border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--fg-3)] hover:text-[var(--fg-2)]"
                        }
                        title={`฿${fmtMoney(c.money)} · ${c.items_count} article${c.items_count > 1 ? "s" : ""}`}
                      >
                        {c.label} <span className="text-[var(--fg-4)]">{c.items_count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {loading ? (
                  <p className="rounded bg-[var(--bg-2)] px-3 py-6 text-center text-xs text-[var(--fg-4)]">Chargement…</p>
                ) : error ? (
                  <p className="rounded bg-[var(--bad-soft)] px-3 py-6 text-center text-xs text-[var(--bad)]">{error}</p>
                ) : filteredItems.length === 0 ? (
                  <p className="rounded bg-[var(--bg-2)] px-3 py-6 text-center text-xs text-[var(--fg-4)]">
                    {items.length === 0
                      ? "Aucune donnée d\u2019articles pour cette période."
                      : "Aucun article ne correspond à la recherche/filtre."}
                  </p>
                ) : (
                  <div className="max-h-[320px] overflow-y-auto rounded border border-[var(--line)] bg-[var(--bg-2)] p-1">
                    {filteredItems.slice(0, 60).map((it) => {
                      const checked = selected.has(it.item_name);
                      return (
                        <label
                          key={it.item_name}
                          className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-[var(--surface-2)]"
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleItem(it.item_name)} aria-label={it.item_name} />
                          <span className="flex-1 truncate text-[13px] text-[var(--fg)]">{it.item_name}</span>
                          {it.category_name && <span className="text-[11px] text-[var(--fg-4)]">{it.category_name}</span>}
                          <span className="w-[90px] text-right font-mono text-xs tabular-nums text-[var(--fg-2)]">฿{fmtMoney(it.total_money)}</span>
                        </label>
                      );
                    })}
                    {filteredItems.length > 60 && (
                      <p className="px-2 py-1.5 text-[11px] text-[var(--fg-4)]">
                        … {filteredItems.length - 60} autres articles — affine la recherche.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Récap de la sélection quand la liste est repliée */}
            {!listShown && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-4)]">Sélection</span>
                {selectedItems.slice(0, 8).map((it) => (
                  <button
                    key={it.item_name}
                    type="button"
                    onClick={() => toggleItem(it.item_name)}
                    title="Cliquer pour retirer"
                    className="inline-flex items-center gap-1 rounded-[var(--r-pill)] border border-[var(--line)] bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]"
                  >
                    {it.item_name} <XIcon style={{ width: 9, height: 9 }} />
                  </button>
                ))}
                {selectedItems.length > 8 && <Pill size="sm" tone="outline">+{selectedItems.length - 8} autres</Pill>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Résultats */}
      {selectedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Ventes — sélection</span>
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setView("items")}
                  className={view === "items" ? "rounded-[var(--r-pill)] bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]" : "rounded-[var(--r-pill)] border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--fg-3)]"}
                >
                  Par article
                </button>
                <button
                  type="button"
                  onClick={() => setView("daily")}
                  className={view === "daily" ? "rounded-[var(--r-pill)] bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]" : "rounded-[var(--r-pill)] border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--fg-3)]"}
                >
                  Journalier
                </button>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* KPIs */}
            <div className="mb-5 flex gap-8 overflow-x-auto">
              <Stat label="CA total" value={`฿${fmtMoney(totals.money)}`} />
              <Stat label="Quantité" value={fmtQty(totals.qty)} />
              <Stat label="Moy. / jour" value={`฿${fmtMoney(data && data.dates.length > 0 ? totals.money / data.dates.length : 0)}`} />
              <Stat label="Articles" value={selectedItems.length} />
            </div>

            {/* Série journalière (marche sauvegardée du CA de la sélection) */}
            {maxDaily > 0 && (
              <div className="mb-5 flex h-[64px] items-end gap-[2px] overflow-x-auto pt-1">
                {totals.dailySeries.map((v, i) => (
                  <div
                    key={data?.dates[i] ?? i}
                    title={`${data?.dates[i]} : ฿${fmtMoney(v)} (${fmtQty(totals.byDay.get(data?.dates[i] ?? "")?.q ?? 0)} u.)`}
                    className="min-w-[6px] flex-1 rounded-t-sm"
                    style={{
                      height: maxDaily > 0 ? `${Math.max(2, (v / maxDaily) * 100)}%` : 0,
                      backgroundColor: v > 0 ? "var(--bronze)" : v < 0 ? "var(--bad)" : "var(--line-2)",
                      opacity: v === 0 ? 0.7 : 1,
                    }}
                  />
                ))}
              </div>
            )}

            {view === "items" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-xs text-[var(--fg-4)]">
                      <th className="py-1.5 pr-3 text-left">Article</th>
                      <th className="py-1.5 pr-3 text-left">Catégorie</th>
                      <th className="py-1.5 pr-3 text-right">Qté</th>
                      <th className="py-1.5 pr-3 text-right">CA (THB)</th>
                      <th className="py-1.5 pr-3 text-right">Part</th>
                      <th className="py-1.5 text-left">Shops (CA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...selectedItems] // déjà triés par CA desc côté API
                      .map((it) => {
                        const pct = totals.money !== 0 ? (it.total_money / totals.money) * 100 : 0;
                        const shops = Object.entries(it.by_location)
                          .sort((a, b) => b[1] - a[1]);
                        const priceBuckets = data?.prices?.[it.item_name] ?? [];
                        const expanded = expandedPrices.has(it.item_name);
                        return (
                          <React.Fragment key={it.item_name}>
                            <tr className="border-b border-[var(--line-2)]">
                              <td className="py-1.5 pr-3 font-medium text-[var(--fg)]">{it.item_name}</td>
                              <td className="py-1.5 pr-3 text-xs text-[var(--fg-4)]">{it.category_name ?? "—"}</td>
                              <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{fmtQty(it.quantity)}</td>
                              <td className="py-1.5 pr-3 text-right font-mono tabular-nums">฿{fmtMoney(it.total_money)}</td>
                              <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-[var(--fg-2)]">{fmtQty(pct)}%</td>
                              <td className="py-1.5">
                                <span className="flex flex-wrap items-center gap-1">
                                  {shops.slice(0, 3).map(([loc, m]) => (
                                    <Pill key={loc} tone="outline" size="sm">
                                      {locationName(loc)} ฿{fmtMoney(m)}
                                    </Pill>
                                  ))}
                                  {shops.length > 3 && <Pill tone="neutral" size="sm">+{shops.length - 3}</Pill>}
                                  {priceBuckets.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedPrices((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(it.item_name)) next.delete(it.item_name);
                                          else next.add(it.item_name);
                                          return next;
                                        })
                                      }
                                      className={
                                        expanded
                                          ? "inline-flex items-center gap-0.5 rounded-[var(--r-pill)] bg-[var(--accent-soft)] px-1.5 text-[11px] font-medium text-[var(--accent)]"
                                          : "inline-flex items-center gap-0.5 rounded-[var(--r-pill)] border border-[var(--line)] px-1.5 text-[11px] text-[var(--fg-3)] hover:text-[var(--fg-2)]"
                                      }
                                      title="Détail par prix tapé en caisse"
                                    >
                                      {priceBuckets.length > 1 ? `${priceBuckets.length} prix` : "1 prix"}{" "}
                                      <ChevronDownIcon style={{ width: 10, height: 10, transform: expanded ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
                                    </button>
                                  )}
                                </span>
                              </td>
                            </tr>
                            {expanded && (
                              <tr className="border-b border-[var(--line-2)] bg-[var(--bg-2)]">
                                <td colSpan={6} className="px-3 py-2">
                                  {priceBuckets.length > 0 ? (
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-4)]">
                                          <th className="py-1 pr-3 text-left">Prix tapé</th>
                                          <th className="py-1 pr-3 text-right">Lignes</th>
                                          <th className="py-1 pr-3 text-right">Unités</th>
                                          <th className="py-1 text-right">Total (THB)</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {priceBuckets.map((b) => (
                                          <tr key={b.p} className="border-t border-[var(--line-2)]">
                                            <td className="py-1 pr-3 font-mono tabular-nums text-[var(--fg)]">฿{fmtQty(b.p)}</td>
                                            <td className="py-1 pr-3 text-right font-mono tabular-nums">{fmtQty(b.n)}</td>
                                            <td className="py-1 pr-3 text-right font-mono tabular-nums">{fmtQty(b.q)}</td>
                                            <td className="py-1 text-right font-mono tabular-nums">฿{fmtMoney(b.m)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <p className="text-[11px] text-[var(--fg-4)]">Pas encore de détail par prix pour cet article (backfill 30j en cours ou article ancien).</p>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-xs text-[var(--fg-4)]">
                      <th className="py-1.5 pr-3 text-left">Date</th>
                      <th className="py-1.5 pr-3 text-right">Qté</th>
                      <th className="py-1.5 text-right">CA (THB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.dates.map((d) => {
                      const day = totals.byDay.get(d);
                      return (
                        <tr key={d} className="border-b border-[var(--line-2)]">
                          <td className="py-1.5 pr-3 font-mono text-xs tabular-nums text-[var(--fg-2)]">{d}</td>
                          <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{fmtQty(day?.q ?? 0)}</td>
                          <td className="py-1.5 text-right font-mono tabular-nums">฿{fmtMoney(day?.m ?? 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
