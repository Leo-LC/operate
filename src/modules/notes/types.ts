/** Page notes ("j'aimerais ajouter cette fonctionnalité", "attention erreur ici", …)
 *  attached to a dashboard route. Shared between owner + admin. */

export const NOTE_KINDS = ["suggestion", "alerte"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export interface PageNote {
  id: string;
  path: string;
  module_key: string | null;
  kind: NoteKind;
  body: string;
  author_id: string | null;
  author_email: string;
  author_name: string | null;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

export const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  suggestion: "Suggestion",
  alerte: "Alert",
};

export function isNoteKind(value: unknown): value is NoteKind {
  return typeof value === "string" && (NOTE_KINDS as readonly string[]).includes(value);
}

export function moduleKeyFromPath(path: string): string | null {
  const first = path.split("/").filter(Boolean)[0];
  return first ?? null;
}

/* Route prefix → module display name (longest prefix wins). */
const MODULE_ROUTE_LABELS: [prefix: string, label: string][] = [
  ["/loyverse-preview", "Shifts & Sales"],
  ["/shift-sales", "Shifts & Sales"],
  ["/loyverse-sandbox", "Loyverse Sandbox"],
  ["/loyverse-export", "Loyverse Export"],
  ["/loyverse", "Loyverse"],
  ["/customer-insights", "Customer Insights"],
  ["/finance/recurring-costs", "Recurring costs"],
  ["/finance/shop-settings", "Shop settings"],
  ["/direction", "Direction"],
  ["/reviews", "Reviews"],
  ["/challenges", "Challenges"],
  ["/scheduling", "Scheduling"],
  ["/attendance", "Attendance"],
  ["/payments", "Payments"],
  ["/employees", "Employees"],
  ["/accounting", "Accounting"],
  ["/reports", "Reports"],
  ["/treasury", "Treasury"],
  ["/documents", "Documents"],
  ["/animals", "Animals"],
  ["/directory", "Directory"],
  ["/wiki", "Wiki"],
  ["/brand", "Brand"],
  ["/admin", "Admin"],
  ["/home", "Home"],
  ["/overview", "Overview"],
];

/** "/loyverse" → "Loyverse", "/finance/recurring-costs" → "Recurring costs".
 *  Unknown routes fall back to a prettified first segment. */
export function moduleDisplayName(path: string): string {
  for (const [prefix, label] of MODULE_ROUTE_LABELS) {
    if (path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)) {
      return label;
    }
  }
  const first = path.split("/").filter(Boolean)[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : path;
}

export function groupNotesByPath(notes: PageNote[]): Map<string, PageNote[]> {
  const groups = new Map<string, PageNote[]>();
  for (const note of notes) {
    const list = groups.get(note.path) ?? [];
    list.push(note);
    groups.set(note.path, list);
  }
  return groups;
}

/** Compact relative time in French, e.g. "à l'instant", "il y a 3 j". */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)} yr ago`;
}
