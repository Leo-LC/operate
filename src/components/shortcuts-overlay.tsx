"use client";

import { useEffect } from "react";
import { XIcon } from "lucide-react";

const SECTIONS = [
  {
    title: "Navigation",
    items: [
      { keys: ["⌘K"], label: "Open command palette" },
      { keys: ["g", "o"], label: "Go to Overview" },
      { keys: ["g", "r"], label: "Go to Reviews" },
      { keys: ["g", "s"], label: "Go to Scheduling" },
      { keys: ["g", "a"], label: "Go to Attendance" },
      { keys: ["g", "p"], label: "Go to Payments" },
      { keys: ["g", "n"], label: "Go to Animals" },
      { keys: ["g", "d"], label: "Go to Documents" },
      { keys: ["g", "c"], label: "Go to Accounting" },
      { keys: ["g", "e"], label: "Go to Reports" },
      { keys: ["g", "t"], label: "Go to Contacts" },
      { keys: ["g", "w"], label: "Go to Wiki" },
      { keys: ["g", "b"], label: "Go to Brand" },
      { keys: ["g", "m"], label: "Go to Admin" },
    ],
  },
  {
    title: "Accounting",
    items: [
      { keys: ["j"], label: "Next day in drawer" },
      { keys: ["k"], label: "Previous day in drawer" },
      { keys: ["Esc"], label: "Close drawer" },
    ],
  },
  {
    title: "General",
    items: [
      { keys: ["?"], label: "Show this overlay" },
      { keys: ["T"], label: "Toggle dark / light mode" },
      { keys: ["Esc"], label: "Close any modal or overlay" },
    ],
  },
];

interface ShortcutsOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsOverlay({ open, onClose }: ShortcutsOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-6"
      style={{ background: "var(--overlay-soft)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: "92vw",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>
              Keyboard shortcuts
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
              Press <kbd style={{ fontSize: 10, fontFamily: "var(--font-mono)", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 4, padding: "1px 5px" }}>?</kbd> any time to open this.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--r-sm)",
              color: "var(--fg-3)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--fg-4)",
                  fontWeight: 500,
                  fontFamily: "var(--font-sans)",
                  marginBottom: 10,
                }}
              >
                {section.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {section.items.map((item, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ flex: 1, fontSize: 13, color: "var(--fg-2)" }}>
                      {item.label}
                    </span>
                    <span style={{ display: "inline-flex", gap: 4 }}>
                      {item.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          style={{
                            fontSize: 11,
                            fontFamily: "var(--font-mono)",
                            color: "var(--fg-3)",
                            background: "var(--bg-2)",
                            border: "1px solid var(--line)",
                            borderRadius: "var(--r-sm)",
                            padding: "2px 6px",
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
