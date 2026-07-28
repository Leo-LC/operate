/** Shared text normalization for form response values. */
export function normalizeKey(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?!.,;:'"()[\]]/g, "");
}

export function titleCase(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (part.length <= 3 && part === part.toUpperCase()) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Strip parenthetical notes e.g. "Phuket (old town)" */
export function stripNotes(raw: string): string {
  return raw.replace(/\([^)]*\)/g, "").trim();
}

/** Use the raw answer as the display label when no alias matches. */
export function rawLabel(raw: string): string {
  const cleaned = stripNotes(raw);
  return titleCase(cleaned || raw.trim());
}
