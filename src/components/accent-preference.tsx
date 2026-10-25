"use client";

import { useEffect, useState } from "react";
import {
  ACCENT_EVENT,
  ACCENT_OPTIONS,
  ACCENT_STORAGE_KEY,
  applyAccent,
  readAccent,
  writeAccent,
  type AccentPreference,
} from "@/lib/accent";

/** Keeps <html data-accent> in sync across tabs. Renders nothing. */
export function AccentSync() {
  useEffect(() => {
    const sync = () => applyAccent(readAccent());
    sync();

    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === ACCENT_STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(ACCENT_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(ACCENT_EVENT, sync);
    };
  }, []);

  return null;
}

/**
 * Personal accent preference. Stored in localStorage only; the company theme
 * remains owner-controlled on /admin/appearance.
 */
export function AccentPreferenceControl() {
  const [value, setValue] = useState<AccentPreference>("default");

  useEffect(() => {
    const sync = () => setValue(readAccent());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(ACCENT_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(ACCENT_EVENT, sync);
    };
  }, []);

  function choose(next: AccentPreference) {
    setValue(next);
    writeAccent(next);
  }

  return (
    <fieldset style={{ margin: 0, padding: 0, border: 0, minWidth: 0 }}>
      <legend
        style={{
          padding: 0,
          fontSize: "var(--ui-text-title)",
          fontWeight: 600,
          color: "var(--ui-fg-1)",
        }}
      >
        Accent color
      </legend>
      <p
        style={{
          margin: "4px 0 14px",
          fontSize: "var(--ui-text-body)",
          color: "var(--ui-fg-3)",
          lineHeight: 1.45,
        }}
      >
        Used by selected controls, primary actions and the main chart series. Light and dark
        mode stay as they are.
      </p>

      <div style={{ display: "grid", gap: 8 }}>
        {ACCENT_OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <label key={option.value} className="ui-accent-option" data-active={active}>
              <input
                type="radio"
                name="operate-accent"
                value={option.value}
                checked={active}
                onChange={() => choose(option.value)}
                className="sr-only"
              />
              <span className="ui-accent-swatch" data-swatch={option.value} aria-hidden />
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span>{option.label}</span>
                <span
                  style={{
                    fontSize: "var(--ui-text-note)",
                    fontWeight: 400,
                    color: "var(--ui-fg-3)",
                  }}
                >
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <p
        style={{
          margin: "14px 0 0",
          fontSize: "var(--ui-text-note)",
          color: "var(--ui-fg-4)",
          lineHeight: 1.45,
        }}
      >
        Saved in this browser only. It does not change other people&apos;s screens or the
        company theme.
      </p>
    </fieldset>
  );
}
