"use client";
import Link from "next/link";
import { ReactNode } from "react";

export function WikiLink({ slug, title, children }: { slug: string; title?: string; children: ReactNode }) {
  return (
    <Link
      href={`/wiki/thai-taxes/${slug}`}
      title={title}
      style={{ color: "var(--bronze)", fontWeight: 600, textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 2 }}
    >
      {children}
    </Link>
  );
}
