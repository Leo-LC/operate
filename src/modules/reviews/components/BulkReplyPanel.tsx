"use client";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ReviewWithLocation } from "@/types/review";
import type { BulkConfirm } from "@/modules/reviews/hooks/useBulkSend";

const BACKDROP: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 50,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(43,35,27,0.55)", backdropFilter: "blur(2px)",
  padding: "0 16px",
};

const PANEL: React.CSSProperties = {
  width: "100%", maxWidth: 400,
  borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
  background: "var(--surface)", padding: 20,
  boxShadow: "var(--shadow-2)",
};

interface BulkReplyPanelProps {
  bulkConfirm: BulkConfirm | null;
  bulkSending: boolean;
  bulkProgress: { current: number; total: number } | null;
  onCancel: () => void;
  onConfirm: (list: ReviewWithLocation[]) => void;
}

export function BulkReplyPanel({
  bulkConfirm,
  bulkSending,
  bulkProgress,
  onCancel,
  onConfirm,
}: BulkReplyPanelProps) {
  return (
    <>
      {bulkConfirm && !bulkSending && bulkConfirm.list.length > 0 && (
        <div style={BACKDROP}>
          <div style={PANEL}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>Send bulk replies?</h2>
            <p style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 16 }}>
              You are about to send replies to{" "}
              <span style={{ fontWeight: 500, color: "var(--fg)" }}>
                {bulkConfirm.list.length} review{bulkConfirm.list.length === 1 ? "" : "s"}
              </span>{" "}
              ({bulkConfirm.label}).
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button size="sm" variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => onConfirm(bulkConfirm.list)}>
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {bulkSending && bulkProgress && (
        <div style={BACKDROP}>
          <div style={{ ...PANEL, maxWidth: 440 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Loader2Icon className="size-4 animate-spin" style={{ color: "var(--fg-3)" }} />
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>Sending replies…</h2>
            </div>
            <p style={{ marginTop: 8, fontSize: 12, color: "var(--fg-3)" }}>
              Sending reply {bulkProgress.current} of {bulkProgress.total}. Please keep this window
              open.
            </p>
            <Progress
              value={(bulkProgress.current / bulkProgress.total) * 100}
              className="mt-3"
            />
          </div>
        </div>
      )}
    </>
  );
}
