import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Shadcn tokens ── */
        background:          "var(--background)",
        foreground:          "var(--foreground)",
        card:                { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        popover:             { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
        primary:             { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary:           { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        muted:               { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent:              { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        destructive:         { DEFAULT: "var(--destructive)" },
        border:              "var(--border)",
        input:               "var(--input)",
        ring:                "var(--ring)",
        sidebar: {
          DEFAULT:            "var(--sidebar)",
          foreground:         "var(--sidebar-foreground)",
          primary:            "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent:             "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border:             "var(--sidebar-border)",
          ring:               "var(--sidebar-ring)",
        },

        /* ── Design tokens: surfaces ── */
        sand:     "var(--sand)",
        "sand-2": "var(--sand-2)",
        wheat:    "var(--wheat)",
        paper:    "var(--paper)",
        "paper-2": "var(--paper-2)",

        /* ── Design tokens: ink ── */
        ink:    "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        "ink-4": "var(--ink-4)",
        "ink-5": "var(--ink-5)",
        stone:  "var(--stone)",

        /* ── Design tokens: accent ── */
        bronze:       "var(--bronze)",
        "bronze-2":   "var(--bronze-2)",
        "bronze-soft": "var(--bronze-soft)",

        /* ── Design tokens: status ── */
        good:       "var(--good)",
        "good-soft": "var(--good-soft)",
        warn:       "var(--warn)",
        "warn-soft": "var(--warn-soft)",
        bad:        "var(--bad)",
        "bad-soft":  "var(--bad-soft)",
        info:       "var(--info)",
        "info-soft": "var(--info-soft)",

        /* ── Design tokens: semantic ── */
        fg:         "var(--fg)",
        "fg-2":     "var(--fg-2)",
        "fg-3":     "var(--fg-3)",
        "fg-4":     "var(--fg-4)",
        "fg-mute":  "var(--fg-mute)",
        bg:         "var(--bg)",
        "bg-2":     "var(--bg-2)",
        surface:    "var(--surface)",
        "surface-2": "var(--surface-2)",
      },
      borderRadius: {
        /* Design radius tokens */
        sm:   "var(--r-sm)",
        md:   "var(--r-md)",
        lg:   "var(--r-lg)",
        xl:   "var(--r-xl)",
        pill: "var(--r-pill)",
      },
      spacing: {
        /* Design spacing scale */
        "s-1": "var(--s-1)",
        "s-2": "var(--s-2)",
        "s-3": "var(--s-3)",
        "s-4": "var(--s-4)",
        "s-5": "var(--s-5)",
        "s-6": "var(--s-6)",
        "s-7": "var(--s-7)",
        "s-8": "var(--s-8)",
        "s-9": "var(--s-9)",
      },
      fontFamily: {
        sans:       ["var(--font-sans)", "system-ui", "sans-serif"],
        serif:      ["var(--font-serif)", "Georgia", "serif"],
        display:    ["var(--font-display)", "Georgia", "serif"],
        script:     ["var(--font-script)", "cursive"],
        mono:       ["var(--font-mono)", "ui-monospace", "monospace"],
        decorative: ["var(--font-display)", "Georgia", "serif"],
      },
      transitionTimingFunction: {
        ease: "var(--ease)",
      },
      transitionDuration: {
        "dur":   "var(--dur)",
        "dur-2": "var(--dur-2)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
