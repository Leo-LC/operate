"use client";
import { ReactNode, useState } from "react";
import { useWikiLang } from "./LanguageProvider";

interface Tab {
  id: string;
  label: Record<"fr" | "en", string>;
  content: ReactNode;
}

export function ArticleTabs({ tabs }: { tabs: Tab[] }) {
  const { lang } = useWikiLang();
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <div>
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)", marginBottom: 20 }}>
        {tabs.map((tab) => {
          const isActive = tab.id === active?.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              style={{
                padding: "8px 4px",
                marginBottom: -1,
                border: "none",
                borderBottom: `2px solid ${isActive ? "var(--bronze)" : "transparent"}`,
                background: "none",
                fontSize: 12.5,
                fontWeight: 700,
                color: isActive ? "var(--bronze)" : "var(--fg-3)",
                cursor: "pointer",
                marginRight: 16,
              }}
            >
              {tab.label[lang]}
            </button>
          );
        })}
      </div>
      {active?.content}
    </div>
  );
}
