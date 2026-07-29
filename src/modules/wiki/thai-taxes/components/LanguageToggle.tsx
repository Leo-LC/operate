"use client";
import { useWikiLang } from "./LanguageProvider";

export function LanguageToggle() {
  const { lang, setLang } = useWikiLang();
  return (
    <div
      role="group"
      aria-label="Langue / Language"
      style={{
        display: "inline-flex",
        borderRadius: "var(--r-pill)",
        border: "1px solid var(--line)",
        background: "var(--surface)",
        padding: 2,
        flexShrink: 0,
      }}
    >
      {(["fr", "en"] as const).map((option) => {
        const active = lang === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLang(option)}
            aria-pressed={active}
            style={{
              borderRadius: "var(--r-pill)",
              border: "none",
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              background: active ? "var(--bronze)" : "transparent",
              color: active ? "#fff" : "var(--fg-3)",
              transition: "background 150ms, color 150ms",
            }}
          >
            {option.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
