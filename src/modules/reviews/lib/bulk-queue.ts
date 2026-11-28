import { toast } from "sonner";

export interface BulkQueueItem {
  reviewId: string;
  locationName: string;
  comment: string;
}

export interface BulkQueueState {
  running: boolean;
  /** Replies processed so far, failures included. */
  done: number;
  total: number;
}

type Listener = () => void;

interface BulkQueueHandlers {
  onSent?: (reviewId: string) => void;
}

const IDLE: BulkQueueState = { running: false, done: 0, total: 0 };

/**
 * Module-level singleton queue for bulk review replies.
 *
 * Lives outside React so a batch keeps sending while the user navigates to
 * another module — only a full page reload or closing the tab interrupts it
 * (sends run client-side against PUT /api/reviews/reply, sequentially).
 * UI subscribes via useSyncExternalStore: useBulkSend (button states) and
 * the floating BulkReplyIndicator mounted in the app shell.
 */
class BulkReplyQueue {
  private state: BulkQueueState = IDLE;
  private listeners = new Set<Listener>();
  private handlers: BulkQueueHandlers = {};
  private stopRequested = false;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): BulkQueueState => this.state;

  /** Inbox callbacks — re-registered on every DashboardClient mount. */
  setHandlers(handlers: BulkQueueHandlers) {
    this.handlers = handlers;
  }

  /** Finish the current reply, skip the rest of the queue. */
  stop() {
    this.stopRequested = true;
  }

  /** Send replies sequentially. No-op while another batch is running. */
  async start(items: BulkQueueItem[]): Promise<void> {
    if (this.state.running || items.length === 0) return;
    this.stopRequested = false;
    this.setAndNotify({ running: true, done: 0, total: items.length });

    let sent = 0;
    let failed = 0;
    for (let i = 0; i < items.length; i++) {
      if (this.stopRequested) break;
      const item = items[i]!;
      this.setAndNotify({ running: true, done: i, total: items.length });
      try {
        const res = await fetch("/api/reviews/reply", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationName: item.locationName,
            reviewId: item.reviewId,
            comment: item.comment,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          failed += 1;
          toast.error(`Failed: ${(err as { error?: string }).error ?? res.statusText}`);
        } else {
          sent += 1;
          toast.success("Reply sent");
          this.handlers.onSent?.(item.reviewId);
        }
      } catch (e) {
        failed += 1;
        toast.error(e instanceof Error ? e.message : "Request failed");
      }
      this.setAndNotify({ running: true, done: i + 1, total: items.length });
    }

    this.setAndNotify(IDLE);
    if (this.stopRequested) {
      const skipped = items.length - sent - failed;
      toast.info(`Bulk send stopped — ${sent} sent, ${failed} failed, ${skipped} skipped.`);
    } else if (failed > 0) {
      toast.error(`${failed} reply(ies) failed. Others were sent.`);
    }
  }

  private setAndNotify(next: BulkQueueState) {
    this.state = next;
    for (const listener of Array.from(this.listeners)) listener();
  }
}

export const bulkReplyQueue = new BulkReplyQueue();
