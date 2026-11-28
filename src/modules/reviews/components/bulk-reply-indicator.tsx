"use client";
import { useSyncExternalStore } from "react";
import { Loader2Icon, XIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { bulkReplyQueue } from "@/modules/reviews/lib/bulk-queue";

/**
 * Non-blocking floating badge for the bulk reply queue. Rendered from the app
 * shell so it stays visible when the user leaves the reviews inbox — the send
 * loop keeps running in the background (see bulk-queue.ts). No backdrop: the
 * rest of the UI stays fully clickable.
 */
export function BulkReplyIndicator() {
  const state = useSyncExternalStore(bulkReplyQueue.subscribe, bulkReplyQueue.getState);
  if (!state.running || state.total === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        zIndex: 60,
        width: 280,
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--line)",
        background: "var(--surface)",
        padding: "12px 14px",
        boxShadow: "var(--shadow-2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Loader2Icon className="size-4 shrink-0 animate-spin" style={{ color: "var(--fg-3)" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
          Sending replies ({state.done}/{state.total})
        </span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => bulkReplyQueue.stop()}
          title="Stop after the current reply"
          aria-label="Stop bulk send"
          style={{
            width: 24,
            height: 24,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--r-sm)",
            border: "none",
            background: "transparent",
            color: "var(--fg-4)",
            cursor: "pointer",
            flexShrink: 0,
          }}
          className="hover:!bg-[var(--row-hover)] hover:!text-[var(--fg-2)]"
        >
          <XIcon size={14} />
        </button>
      </div>
      <Progress value={(state.done / state.total) * 100} className="mt-2" />
      <p style={{ marginTop: 6, fontSize: 11, color: "var(--fg-4)" }}>
        You can leave this page — sending continues in the background.
      </p>
    </div>
  );
}
