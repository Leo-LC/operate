"use client";
import React, { useState, useMemo, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { PillButton } from "@/components/ui/pill-button";
import { PlusIcon, DownloadIcon, ListIcon, SyringeIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import type { Animal } from "@/modules/animals/types";
import type { AdminLocation } from "@/modules/admin/types";
import { AnimalModal } from "@/modules/animals/components/AnimalModal";

type SpeciesOption = { key: string; label: string };

interface AnimalsListClientProps {
  initialAnimals: Animal[];
  locations: AdminLocation[];
}

type ViewMode = "animals" | "vaccines";

function fmtDate(d: string | null | undefined): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function AnimalsListClient({ initialAnimals, locations }: AnimalsListClientProps) {
  const [animals, setAnimals] = useState(initialAnimals);
  const [view, setView] = useState<ViewMode>("animals");
  const [shopFilter, setShopFilter] = useState("");
  const [modal, setModal] = useState<{ animal: Animal | null; duplicate?: { animal: Animal; vaccineDates: string[] } | null } | null>(null);

  const displayedAnimals = useMemo(() => {
    return animals.filter((a) => {
      if (shopFilter && a.location_id !== shopFilter) return false;
      return true;
    });
  }, [animals, shopFilter]);

  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const vaccineDueCount = animals.filter((a) => a.next_vaccination_date && a.next_vaccination_date <= in30).length;
  const missingLocationCount = animals.filter((a) => !a.location_id).length;

  const [speciesList, setSpeciesList] = useState<SpeciesOption[]>([]);

  const speciesCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of displayedAnimals) {
      const k = (a.species ?? "").trim().toLowerCase();
      if (!k) continue;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [displayedAnimals]);

  const speciesCards = useMemo(() => {
    // Order by speciesList sort order, then any extra species alphabetically
    const labelMap = new Map(speciesList.map((s) => [s.key, s.label] as const));
    const ordered: SpeciesOption[] = [];
    for (const s of speciesList) {
      if (speciesCounts.has(s.key)) ordered.push(s);
    }
    for (const [key] of Array.from(speciesCounts.entries())) {
      if (!labelMap.has(key)) {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        ordered.push({ key, label });
      }
    }
    // Include speciesList items with 0 count? no – only those with animals
    return ordered;
  }, [speciesList, speciesCounts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/animals/species", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const json = (await res.json()) as { species: SpeciesOption[] };
        if (!cancelled) setSpeciesList((json.species ?? []).map((s) => ({ key: s.key, label: s.label })));
      } catch {
        // fallback to distinct from animals + defaults
        if (!cancelled) {
          const set = new Map<string, string>();
          set.set("capybara", "Capybara");
          set.set("meerkat", "Meerkat");
          for (const a of animals) {
            const k = a.species?.trim().toLowerCase();
            if (k && !set.has(k)) set.set(k, a.species.trim().replace(/^\w/, (c) => c.toUpperCase()));
          }
          setSpeciesList(Array.from(set.entries()).map(([key, label]) => ({ key, label })));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [animals]);

  function handleSpeciesCreated(opt: SpeciesOption) {
    setSpeciesList((prev) => {
      if (prev.some((p) => p.key === opt.key)) return prev;
      return [...prev, opt].sort((a, b) => a.label.localeCompare(b.label));
    });
  }

  async function handleDuplicate(animal: Animal) {
    try {
      const res = await fetch(`/api/animals/${animal.id}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { animal: Animal; vaccination_dates: string[] };
      setModal({ animal: null, duplicate: { animal: data.animal, vaccineDates: data.vaccination_dates ?? [] } });
    } catch {
      // fallback: duplicate with known fields only
      toast.error("Could not load vaccine history — duplicating basic info only");
      setModal({ animal: null, duplicate: { animal, vaccineDates: animal.last_vaccination_date ? [animal.last_vaccination_date] : [] } });
    }
  }

  function upsertAnimal(updated: Animal) {
    setAnimals((prev) => {
      const exists = prev.some((a) => a.id === updated.id);
      return exists ? prev.map((a) => (a.id === updated.id ? updated : a)) : [...prev, updated];
    });
  }

  function removeAnimal(id: string) {
    setAnimals((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-6)" }}>
      <PageHeader
        eyebrow="Operations"
        title="Animals"
        subtitle="Track each animal and its vaccine schedule, per shop."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
            <div style={{ display: "flex", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", overflow: "hidden" }}>
              {(["animals", "vaccines"] as const).map((v, i) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "0 var(--s-3)", height: 32, fontSize: 12, cursor: "pointer", border: "none",
                    borderLeft: i > 0 ? "1px solid var(--line)" : "none",
                    background: view === v ? "var(--row-active)" : "var(--bg)",
                    color: view === v ? "var(--fg)" : "var(--fg-4)",
                    transition: "background var(--dur) var(--ease)",
                  }}
                >
                  {v === "animals"
                    ? <ListIcon style={{ width: 13, height: 13 }} />
                    : <SyringeIcon style={{ width: 13, height: 13 }} />}
                  {v === "animals" ? "Animals" : "Vaccines"}
                </button>
              ))}
            </div>
            <a href="/api/animals/export" download style={{ textDecoration: "none" }}>
              <Button size="sm" variant="secondary"><DownloadIcon style={{ width: 13, height: 13 }} /> CSV</Button>
            </a>
            <a href="/api/animals/export/pdf" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <Button size="sm" variant="secondary"><DownloadIcon style={{ width: 13, height: 13 }} /> PDF</Button>
            </a>
            <Button size="sm" variant="primary" onClick={() => setModal({ animal: null })}>
              <PlusIcon style={{ width: 13, height: 13 }} /> Add animal
            </Button>
          </div>
        }
      />

      {/* Shop selector (same pattern as shop settings) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 12, color: "var(--fg-3)" }}>View</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PillButton active={!shopFilter} onClick={() => setShopFilter("")}>All shops</PillButton>
          {locations.map((l) => (
            <PillButton key={l.id} active={shopFilter === l.id} onClick={() => setShopFilter(l.id)}>{l.name}</PillButton>
          ))}
        </div>
      </div>

      {view === "animals" ? (
        /* ── Animals view ──────────────────────────────────────────────── */
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
          {/* Summary cards — dynamic per species */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(140px, 1fr))`, gap: 10 }}>
            <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: "var(--s-3) var(--s-4)" }}>
              <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 4 }}>Animals</p>
              <p className="mono" style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{displayedAnimals.length}</p>
            </div>
            {speciesCards.map((sp) => (
              <div key={sp.key} style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: "var(--s-3) var(--s-4)" }}>
                <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 4, textTransform: "capitalize" }}>{sp.label}</p>
                <p className="mono" style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{speciesCounts.get(sp.key) ?? 0}</p>
              </div>
            ))}
            {speciesCards.length === 0 && (
              <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: "var(--s-3) var(--s-4)", opacity: 0.6 }}>
                <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 4 }}>Species</p>
                <p className="mono" style={{ fontSize: 20, fontWeight: 700 }}>—</p>
              </div>
            )}
          </div>

          {/* Animal list */}
          {displayedAnimals.length === 0 ? (
            <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", padding: "48px var(--s-5)", background: "var(--surface)", textAlign: "center", color: "var(--fg-4)", fontSize: 13 }}>
              No animals found — add one to get started.
            </div>
          ) : (
            <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden", background: "var(--surface)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--line)" }}>
                    {["Name", "Species", "Shop", "Last vaccine", "Next vaccine", "", ""].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: "10px var(--s-5)", textAlign: "left",
                          color: "var(--fg-3)", fontWeight: 500, fontSize: 12,
                          width: i >= 5 ? 40 : undefined,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedAnimals.map((animal, idx) => (
                    <tr
                      key={animal.id}
                      style={{ borderTop: idx > 0 ? "1px solid var(--line)" : undefined, cursor: "pointer" }}
                      onClick={() => setModal({ animal })}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--row-hover)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                    >
                      <td style={{ padding: "12px var(--s-5)", fontWeight: 500 }}>{animal.name}</td>
                      <td style={{ padding: "12px var(--s-5)", color: "var(--fg-3)", fontSize: 12, textTransform: "capitalize" }}>{animal.species}</td>
                      <td style={{ padding: "12px var(--s-5)", fontSize: 12 }}>
                        {animal.location_name ?? <span style={{ color: "var(--fg-mute)", fontStyle: "italic" }}>No location</span>}
                      </td>
                      <td style={{ padding: "12px var(--s-5)", fontSize: 12, color: "var(--fg-3)" }}>
                        {fmtDate(animal.last_vaccination_date) ?? <span style={{ color: "var(--fg-mute)" }}>—</span>}
                      </td>
                      <td style={{ padding: "12px var(--s-5)", fontSize: 12, color: "var(--fg-3)" }}>
                        {fmtDate(animal.next_vaccination_date) ?? <span style={{ color: "var(--fg-mute)" }}>—</span>}
                      </td>
                      <td style={{ padding: "12px var(--s-5)", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDuplicate(animal);
                          }}
                          title="Duplicate"
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "var(--r-sm)", border: "1px solid transparent", background: "transparent", color: "var(--fg-4)", cursor: "pointer" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "var(--bg-2)";
                            (e.currentTarget as HTMLElement).style.color = "var(--fg)";
                            (e.currentTarget as HTMLElement).style.borderColor = "var(--line)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                            (e.currentTarget as HTMLElement).style.color = "var(--fg-4)";
                            (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                          }}
                        >
                          <CopyIcon style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                      <td style={{ padding: "12px var(--s-5)", textAlign: "right" }}>
                        <span style={{ color: "var(--fg-4)" }}>›</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ── Vaccines view ──────────────────────────────────────────────── */
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--fg-4)" }}>
              {vaccineDueCount > 0 && <span style={{ color: "var(--warn)", marginRight: 8 }}>{vaccineDueCount} vaccine{vaccineDueCount !== 1 ? "s" : ""} due within 30 days</span>}
              {missingLocationCount > 0 && <span style={{ color: "var(--bad)" }}>{missingLocationCount} animal{missingLocationCount !== 1 ? "s" : ""} without a location</span>}
              {vaccineDueCount === 0 && missingLocationCount === 0 && <span>All animals up to date</span>}
            </span>
          </div>

          <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden", background: "var(--surface)", padding: "var(--s-4)" }}>
            <VaccinationUrgencyList animals={displayedAnimals} locations={locations} onOpen={(a) => setModal({ animal: a })} />
          </div>
        </div>
      )}

      {modal && (
        <AnimalModal
          key={modal.duplicate ? `dup-${modal.duplicate.animal.id}` : modal.animal?.id ?? "new"}
          animal={modal.animal}
          locations={locations}
          speciesList={speciesList}
          onSpeciesCreated={handleSpeciesCreated}
          initialDuplicate={modal.duplicate ?? null}
          onClose={() => setModal(null)}
          onSaved={upsertAnimal}
          onDeleted={removeAnimal}
        />
      )}
    </div>
  );
}

function VaccinationUrgencyList({ animals, locations, onOpen }: { animals: Animal[]; locations: AdminLocation[]; onOpen: (a: Animal) => void }) {
  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const locMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));

  const overdue: Animal[] = [];
  const dueSoon: Animal[] = [];
  const upcoming: Animal[] = [];
  const noDate: Animal[] = [];

  for (const a of animals) {
    if (!a.next_vaccination_date) { noDate.push(a); continue; }
    if (a.next_vaccination_date < today) { overdue.push(a); continue; }
    if (a.next_vaccination_date <= in30) { dueSoon.push(a); continue; }
    upcoming.push(a);
  }

  const sortByDate = (arr: Animal[]) =>
    [...arr].sort((a, b) => (a.next_vaccination_date ?? "").localeCompare(b.next_vaccination_date ?? ""));

  function daysUntil(dateStr: string) {
    const diff = Math.round((new Date(dateStr).getTime() - new Date(today).getTime()) / 86400000);
    return diff;
  }

  function Section({ title, animals: list, badge }: { title: string; animals: Animal[]; badge: (a: Animal) => ReactNode }) {
    if (list.length === 0) return null;
    return (
      <div>
        <p className="eyebrow mb-2" style={{ color: "var(--fg-4)" }}>{title} ({list.length})</p>
        <div style={{ borderRadius: "var(--r-md)", border: "1px solid var(--line)", overflow: "hidden" }}>
          {list.map((a, i) => (
            <div
              key={a.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(a)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(a); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                fontSize: 13,
                borderTop: i === 0 ? "none" : "1px solid var(--line)",
                background: "var(--surface)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 500, color: "var(--fg)" }}>{a.name}</span>
                <span style={{ fontSize: 12, color: "var(--fg-3)", textTransform: "capitalize" }}>{a.species}</span>
                {a.location_id && <span style={{ fontSize: 12, color: "var(--fg-4)" }}>{locMap[a.location_id] ?? ""}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {a.next_vaccination_date && (
                  <span className="mono" style={{ fontSize: 12, color: "var(--fg-4)" }}>{a.next_vaccination_date}</span>
                )}
                {badge(a)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (overdue.length === 0 && dueSoon.length === 0 && upcoming.length === 0 && noDate.length === 0) {
    return (
      <div style={{ borderRadius: "var(--r-md)", border: "1px solid var(--line)", padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--fg-4)" }}>
        No animals with vaccination data yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Section
        title="Overdue"
        animals={sortByDate(overdue)}
        badge={(a) => (
          <Pill tone="bad" size="sm">{Math.abs(daysUntil(a.next_vaccination_date!))}d overdue</Pill>
        )}
      />
      <Section
        title="Due within 30 days"
        animals={sortByDate(dueSoon)}
        badge={(a) => (
          <Pill tone="warn" size="sm">in {daysUntil(a.next_vaccination_date!)}d</Pill>
        )}
      />
      <Section
        title="Upcoming"
        animals={sortByDate(upcoming)}
        badge={(a) => (
          <Pill tone="good" size="sm">in {daysUntil(a.next_vaccination_date!)}d</Pill>
        )}
      />
      <Section
        title="No date set"
        animals={noDate}
        badge={() => (
          <Pill tone="neutral" size="sm">—</Pill>
        )}
      />
    </div>
  );
}