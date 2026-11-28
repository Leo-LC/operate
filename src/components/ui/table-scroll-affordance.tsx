"use client";

import { useEffect } from "react";

/**
 * Flags `.ui-table-scroll` containers that actually overflow, so the mobile
 * "Défilez horizontalement" hint only appears where there is something to
 * scroll. Purely presentational; no table markup or data is touched.
 */
export function TableScrollAffordance() {
  useEffect(() => {
    const mark = () => {
      document.querySelectorAll<HTMLElement>(".ui-table-scroll").forEach((el) => {
        el.toggleAttribute("data-scrollable", el.scrollWidth > el.clientWidth + 2);
      });
    };

    const observed = new WeakSet<Element>();
    const ro = new ResizeObserver(mark);
    const observeAll = () => {
      document.querySelectorAll<HTMLElement>(".ui-table-scroll").forEach((el) => {
        if (observed.has(el)) return;
        observed.add(el);
        ro.observe(el);
      });
    };
    const refresh = () => {
      observeAll();
      mark();
    };

    refresh();
    const mo = new MutationObserver(refresh);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", mark);

    return () => {
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", mark);
    };
  }, []);

  return null;
}
