"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { CheckIcon, CopyIcon } from "lucide-react";
import {
  THAI_BANK_ACCOUNT_PLACEHOLDER,
  formatThaiBankAccount,
  isCompleteThaiBankAccount,
  normalizeThaiBankAccountDigits,
} from "@/modules/admin/lib/thai-bank-account";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts / older mobile browsers
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

export function CopyAccountButton({ value, label = "Copy account number" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!value) return;
    const ok = await copyText(value);
    if (ok) {
      setCopied(true);
      toast.success("Account number copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed — long-press to copy");
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => void handleCopy(e)}
      title={label}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        flexShrink: 0,
        borderRadius: "var(--r-sm)",
        border: "1px solid transparent",
        background: "transparent",
        color: copied ? "var(--good)" : "var(--fg-4)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-2)";
        e.currentTarget.style.color = copied ? "var(--good)" : "var(--fg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = copied ? "var(--good)" : "var(--fg-4)";
      }}
    >
      {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
    </button>
  );
}

export function BankAccountInput({
  value,
  onChange,
  inputStyle,
  id,
}: {
  value: string;
  onChange: (formatted: string) => void;
  inputStyle?: React.CSSProperties;
  id?: string;
}) {
  const digits = normalizeThaiBankAccountDigits(value);
  const complete = isCompleteThaiBankAccount(value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={13}
          value={formatThaiBankAccount(value)}
          onChange={(e) => onChange(formatThaiBankAccount(e.target.value))}
          onPaste={(e) => {
            e.preventDefault();
            onChange(formatThaiBankAccount(e.clipboardData.getData("text")));
          }}
          placeholder={THAI_BANK_ACCOUNT_PLACEHOLDER}
          aria-describedby={id ? `${id}-hint` : undefined}
          style={{ ...(inputStyle ?? {}), paddingRight: 38, fontVariantNumeric: "tabular-nums" }}
        />
        <span style={{ position: "absolute", right: 2 }}>
          <CopyAccountButton value={formatThaiBankAccount(value)} />
        </span>
      </div>
      <span
        id={id ? `${id}-hint` : undefined}
        style={{ fontSize: 10, color: complete ? "var(--good)" : "var(--fg-4)" }}
      >
        {complete ? "✓ XXX-X-XXXXX-X" : `XXX-X-XXXXX-X · ${digits.length}/10 digits`}
      </span>
    </div>
  );
}

/** Read-only formatted account number with a copy icon (e.g. table cells). */
export function BankAccountDisplay({ value, mono = true }: { value: string | null | undefined; mono?: boolean }) {
  const formatted = formatThaiBankAccount(value);
  if (!formatted) return <span style={{ color: "var(--fg-4)" }}>—</span>;
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 2, minWidth: 0 }}
      className={mono ? "mono tabular-nums" : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <span style={{ whiteSpace: "nowrap" }}>{formatted}</span>
      <CopyAccountButton value={formatted} />
    </span>
  );
}
