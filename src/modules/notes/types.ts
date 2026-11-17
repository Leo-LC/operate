/** Page notes ("j'aimerais ajouter cette fonctionnalité", "attention erreur ici", …)
 *  attached to a dashboard route. Shared between owner + admin. */

export const NOTE_KINDS = ["idea", "todo", "warning"] as const;
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
  idea: "Idée",
  todo: "À faire",
  warning: "Alerte",
};

export function isNoteKind(value: unknown): value is NoteKind {
  return typeof value === "string" && (NOTE_KINDS as readonly string[]).includes(value);
}

export function moduleKeyFromPath(path: string): string | null {
  const first = path.split("/").filter(Boolean)[0];
  return first ?? null;
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
export function timeAgoFr(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.floor(months / 12)} an(s)`;
}
