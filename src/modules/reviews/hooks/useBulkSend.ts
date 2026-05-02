"use client";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { ReviewWithLocation } from "@/types/review";

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
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<BulkConfirm | null>(null);

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
      setBulkSending(true);
      setBulkProgress({ current: 0, total: list.length });
      let done = 0;
      const failed: string[] = [];
      for (const r of list) {
        const comment = replyDrafts[r.reviewId]?.trim();
        setBulkProgress({ current: done + 1, total: list.length });
        if (!comment) {
          failed.push(r.reviewId);
          toast.error(`Empty reply for review ${r.reviewId}`);
          done += 1;
          continue;
        }
        try {
          const res = await fetch("/api/reviews/reply", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              locationName: r.locationName,
              reviewId: r.reviewId,
              comment,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            failed.push(r.reviewId);
            toast.error(`Failed: ${(err as { error?: string }).error ?? res.statusText}`);
          } else {
            toast.success("Reply sent");
            onReplySent(r.reviewId);
          }
        } catch (e) {
          failed.push(r.reviewId);
          toast.error(e instanceof Error ? e.message : "Request failed");
        }
        done += 1;
      }
      setBulkProgress(null);
      setBulkSending(false);
      if (failed.length > 0) {
        toast.error(`${failed.length} reply(ies) failed. Others were sent.`);
      }
    },
    [replyDrafts, onReplySent]
  );

  return { bulkSending, bulkProgress, bulkConfirm, openBulkConfirm, cancelBulkConfirm, handleBulkSend };
}
