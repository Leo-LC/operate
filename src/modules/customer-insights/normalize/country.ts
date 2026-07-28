import { KNOWN_COUNTRIES, lookupCountry } from "./countries-data";
import type { NormalizedField } from "../types";
import { normalizeKey, rawLabel, stripNotes, titleCase } from "./text";

function matchKnownCountryName(key: string): string | null {
  for (const country of KNOWN_COUNTRIES) {
    if (country.toLowerCase() === key) {
      return country === "Czechia" ? "Czech Republic" : country;
    }
  }
  return null;
}

export function normalizeCountry(raw: string): NormalizedField {
  const trimmed = stripNotes(raw);
  if (!trimmed) {
    return { canonical: rawLabel(raw), matched: false, raw: trimmed };
  }

  const key = normalizeKey(trimmed);

  const fromLookup = lookupCountry(key);
  if (fromLookup) {
    return { canonical: fromLookup, matched: true, raw: trimmed };
  }

  const fromKnown = matchKnownCountryName(key);
  if (fromKnown) {
    return { canonical: fromKnown, matched: true, raw: trimmed };
  }

  // Multi-value answers: "France / Paris", "UK - London"
  const parts = trimmed.split(/[,;/|–—-]+/).map((p) => normalizeKey(p)).filter(Boolean);
  for (const part of parts) {
    const hit = lookupCountry(part) ?? matchKnownCountryName(part);
    if (hit) {
      return { canonical: hit, matched: true, raw: trimmed };
    }
  }

  // Looks like a plausible country name — keep the answer visible in charts
  if (/^[a-z\s'-]{2,40}$/i.test(trimmed)) {
    const label = titleCase(trimmed);
    return { canonical: label, matched: false, raw: trimmed };
  }

  return { canonical: rawLabel(trimmed), matched: false, raw: trimmed };
}
