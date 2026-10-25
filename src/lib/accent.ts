export type AccentPreference = "default" | "green" | "orange";

export const ACCENT_STORAGE_KEY = "operate.accent";
export const ACCENT_EVENT = "operate:accent";

export const ACCENT_OPTIONS: ReadonlyArray<{
  value: AccentPreference;
  label: string;
  description: string;
}> = [
  {
    value: "default",
    label: "Company default",
    description: "Use the organization's accent. Currently green.",
  },
  {
    value: "green",
    label: "Green",
    description: "The accepted Reviews Stats emerald.",
  },
  {
    value: "orange",
    label: "Orange",
    description: "A warm amber accent that works with both company themes.",
  },
];

/** Invalid or missing values fall back to the company default. */
export function normalizeAccent(value: unknown): AccentPreference {
  return value === "green" || value === "orange" ? value : "default";
}

export function readAccent(): AccentPreference {
  if (typeof window === "undefined") return "default";
  try {
    return normalizeAccent(window.localStorage.getItem(ACCENT_STORAGE_KEY));
  } catch {
    return "default";
  }
}

/** Apply the preference to <html>; "default" removes the override attribute. */
export function applyAccent(value: AccentPreference): void {
  if (typeof document === "undefined") return;
  if (value === "default") {
    delete document.documentElement.dataset.accent;
  } else {
    document.documentElement.dataset.accent = value;
  }
}

/**
 * Persist the preference in this browser only. No database write: the accent
 * is a personal, device-local choice and is never sent to the server.
 */
export function writeAccent(value: AccentPreference): void {
  const next = normalizeAccent(value);
  try {
    if (next === "default") {
      window.localStorage.removeItem(ACCENT_STORAGE_KEY);
    } else {
      window.localStorage.setItem(ACCENT_STORAGE_KEY, next);
    }
  } catch {
    // Private mode or a blocked storage API: still apply for this page.
  }
  applyAccent(next);
  window.dispatchEvent(new CustomEvent(ACCENT_EVENT, { detail: next }));
}

/** Inline script source: applies the stored accent before the first paint. */
export const ACCENT_INIT_SCRIPT = `(function(){try{var v=localStorage.getItem(${JSON.stringify(
  ACCENT_STORAGE_KEY,
)});if(v==="green"||v==="orange"){document.documentElement.dataset.accent=v}}catch(e){}})();`;
