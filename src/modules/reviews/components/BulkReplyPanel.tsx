"use client";
import { Button } from "@/components/ui/button";
import type { ReviewWithLocation } from "@/types/review";
import type { BulkConfirm } from "@/modules/reviews/hooks/useBulkSend";

const BACKDROP: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 50,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "var(--overlay-strong)", backdropFilter: "blur(2px)",
  padding: "0 16px",
};

const PANEL: React.CSSProperties = {
  width: "100%", maxWidth: 400,
  borderRadius: "var(--ui-radius)", border: "var(--ui-line-width) solid var(--ui-line)",
  background: "var(--ui-panel)", padding: 20,
  boxShadow: "var(--ui-shadow-raised)",
};

interface BulkReplyPanelProps {
  bulkConfirm: BulkConfirm | null;
  onCancel: () => void;
  onConfirm: (list: ReviewWithLocation[]) => void;
}

/** Confirmation dialog for bulk replies. Send progress is NOT shown here —
 *  it lives in the non-blocking BulkReplyIndicator (app shell), so the user
 *  can navigate while the batch runs (see bulk-queue.ts). */
export function BulkReplyPanel({
  bulkConfirm,
  onCancel,
  onConfirm,
}: BulkReplyPanelProps) {
  return (
    <>
      {bulkConfirm && bulkConfirm.list.length > 0 && (
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
    </>
  );
}
