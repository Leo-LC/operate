"use client";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ReviewWithLocation } from "@/types/review";
import type { BulkConfirm } from "@/modules/reviews/hooks/useBulkSend";

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-4 shadow-xl">
            <h2 className="mb-1 text-sm font-semibold">Send bulk replies?</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              You are about to send replies to{" "}
              <span className="font-medium text-foreground">
                {bulkConfirm.list.length} review{bulkConfirm.list.length === 1 ? "" : "s"}
              </span>{" "}
              ({bulkConfirm.label}).
            </p>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg text-xs border-border/60 bg-background/70 hover:bg-background/95"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg gap-1.5 text-xs border-border/60 bg-background/80 hover:bg-background/95"
                onClick={() => onConfirm(bulkConfirm.list)}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {bulkSending && bulkProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
              <h2 className="text-sm font-semibold">Sending replies…</h2>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
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
