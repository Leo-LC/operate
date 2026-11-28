"use client";
import { useState, useCallback, useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { ReviewWithLocation } from "@/types/review";
import { bulkReplyQueue } from "@/modules/reviews/lib/bulk-queue";

interface UseBulkSendParams {
  replyDrafts: Record<string, string>;
  onReplySent: (reviewId: string) => void;
}

export interface BulkConfirm {
  list: ReviewWithLocation[];
  label: string;
}

export interface UseBulkSendReturn {
  bulkSending: boolean;
  bulkProgress: { current: number; total: number } | null;
  bulkConfirm: BulkConfirm | null;
  openBulkConfirm: (list: ReviewWithLocation[], label: string) => void;
  cancelBulkConfirm: () => void;
  handleBulkSend: (list: ReviewWithLocation[]) => Promise<void>;
}

export function useBulkSend({ replyDrafts, onReplySent }: UseBulkSendParams): UseBulkSendReturn {
  const [bulkConfirm, setBulkConfirm] = useState<BulkConfirm | null>(null);

  // Live queue state — the queue is a module singleton, so sending survives
  // navigating away from the inbox (only a reload interrupts it).
  const queueState = useSyncExternalStore(bulkReplyQueue.subscribe, bulkReplyQueue.getState);
  const bulkSending = queueState.running;
  const bulkProgress = bulkSending ? { current: queueState.done, total: queueState.total } : null;

  // Keep the queue pointed at the inbox's latest onReplySent while mounted.
  useEffect(() => {
    bulkReplyQueue.setHandlers({ onSent: onReplySent });
  }, [onReplySent]);

  const openBulkConfirm = useCallback(
    (list: ReviewWithLocation[], label: string) => {
      if (bulkSending || list.length === 0) return;
      setBulkConfirm({ list, label });
    },
    [bulkSending]
  );

  const cancelBulkConfirm = useCallback(() => setBulkConfirm(null), []);

  const handleBulkSend = useCallback(
    async (list: ReviewWithLocation[]) => {
      if (list.length === 0) return;
      const items = [];
      for (const r of list) {
        const comment = replyDrafts[r.reviewId]?.trim();
        if (!comment) {
          toast.error(`Empty reply for review ${r.reviewId}`);
          continue;
        }
        items.push({ reviewId: r.reviewId, locationName: r.locationName, comment });
      }
      await bulkReplyQueue.start(items);
    },
    [replyDrafts]
  );

  return { bulkSending, bulkProgress, bulkConfirm, openBulkConfirm, cancelBulkConfirm, handleBulkSend };
}
