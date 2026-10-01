"use client";

export interface ViewToggleOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ElementType;
}

/**
 * Uniform secondary view switch (segmented control).
 * Deliberately distinct from ModuleTabs (underline style): use this for
 * in-content view switches (e.g. Table/Detail, Animals/Vaccines), NOT for
 * module-level navigation tabs.
 */
export function ViewToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly ViewToggleOption<T>[];
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        borderRadius: "var(--r-md)",
        border: "1px solid var(--line)",
        background: "var(--bg-2)",
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 12px",
              borderRadius: "var(--r-sm)",
              fontSize: 12,
              fontWeight: active ? 500 : 400,
              color: active ? "var(--fg)" : "var(--fg-4)",
              background: active ? "var(--surface)" : "transparent",
              border: `1px solid ${active ? "var(--line)" : "transparent"}`,
              boxShadow: active ? "var(--shadow-1)" : "none",
              cursor: "pointer",
              transition: "all var(--dur) var(--ease)",
              whiteSpace: "nowrap",
            }}
          >
            {Icon ? <Icon size={12} strokeWidth={1.5} /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
