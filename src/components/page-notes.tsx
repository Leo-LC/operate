"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LightbulbIcon,
  TriangleAlertIcon,
  StickyNoteIcon,
  CheckIcon,
  RotateCcwIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { NOTE_KIND_LABELS, moduleDisplayName, timeAgo } from "@/modules/notes/types";
import type { NoteKind, PageNote } from "@/modules/notes/types";

const KIND_META: Record<NoteKind, { icon: LucideIcon; color: string; bg: string }> = {
  suggestion: { icon: LightbulbIcon, color: "var(--accent)", bg: "var(--accent-soft)" },
  alerte: { icon: TriangleAlertIcon, color: "var(--warn)", bg: "var(--warn-soft)" },
};

const KIND_ORDER: NoteKind[] = ["suggestion", "alerte"];

function authorLabel(note: PageNote): string {
  if (note.author_name && note.author_name.trim()) return note.author_name.trim();
  return note.author_email.split("@")[0] ?? "?";
}

function initials(name: string): string {
  return name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export function PageNotes() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"page" | "all">("page");
  const [pageNotes, setPageNotes] = useState<PageNote[]>([]);
  const [allNotes, setAllNotes] = useState<PageNote[]>([]);
  const [allLoaded, setAllLoaded] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [newKind, setNewKind] = useState<NoteKind>("suggestion");
  const [newBody, setNewBody] = useState("");
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const loadPageNotes = useCallback(async (path: string) => {
    try {
      const res = await fetch(`/api/notes?path=${encodeURIComponent(path)}`, { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as { notes?: PageNote[] };
      setPageNotes(j.notes ?? []);
    } catch { /* silent */ }
  }, []);

  const loadAllNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes?all=1", { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as { notes?: PageNote[] };
      setAllNotes(j.notes ?? []);
      setAllLoaded(true);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    void loadPageNotes(pathname);
  }, [pathname, loadPageNotes]);

  /* N → toggle the notes drawer (same input-guard pattern as the shell shortcuts) */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (inInput || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open && tab === "all") void loadAllNotes();
  }, [open, tab, loadAllNotes]);

  /* Focus the textarea when the drawer opens on the page tab */
  useEffect(() => {
    if (open && tab === "page") setTimeout(() => bodyRef.current?.focus(), 150);
  }, [open, tab]);

  const activeCount = pageNotes.filter((n) => !n.resolved).length;

  async function handleAdd() {
    const text = newBody.trim();
    if (!text) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, kind: newKind, body: text }),
      });
      const j = (await res.json().catch(() => ({}))) as { note?: PageNote; error?: string };
      if (!res.ok || !j.note) throw new Error(j.error || "Error");
      setPageNotes((prev) => [j.note as PageNote, ...prev]);
      setAllLoaded(false);
      setNewBody("");
      toast.success("Note added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleResolved(note: PageNote) {
    const resolved = !note.resolved;
    setPageNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, resolved } : n)));
    setAllNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, resolved } : n)));
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved }),
      });
      if (!res.ok) throw new Error();
    } catch {
      void loadPageNotes(pathname);
      setAllLoaded(false);
      toast.error("Could not update the note");
    }
  }

  async function handleDelete(note: PageNote) {
    setPageNotes((prev) => prev.filter((n) => n.id !== note.id));
    setAllNotes((prev) => prev.filter((n) => n.id !== note.id));
    try {
      const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      void loadPageNotes(pathname);
      setAllLoaded(false);
      toast.error("Could not delete the note");
    }
  }

  function renderNote(note: PageNote, clickable: boolean) {
    const meta = KIND_META[note.kind];
    const Icon = meta.icon;
    const content = (
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md)",
          background: "var(--surface)",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          opacity: note.resolved ? 0.55 : 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10.5,
              fontWeight: 600,
              color: meta.color,
              background: meta.bg,
              borderRadius: "var(--r-pill)",
              padding: "2px 8px",
            }}
          >
            <Icon size={11} strokeWidth={2} />
            {NOTE_KIND_LABELS[note.kind]}
          </span>
          <span style={{ flex: 1 }} />
          <button
            onClick={() => void handleToggleResolved(note)}
            title={note.resolved ? "Reopen" : "Mark as done"}
            style={{
              width: 24,
              height: 24,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--r-sm)",
              border: "none",
              background: "transparent",
              color: note.resolved ? "var(--good-muted)" : "var(--fg-mute)",
              cursor: "pointer",
            }}
            className="hover:!bg-[var(--row-hover)]"
          >
            {note.resolved ? <RotateCcwIcon size={13} /> : <CheckIcon size={13} />}
          </button>
          <button
            onClick={() => void handleDelete(note)}
            title="Delete"
            style={{
              width: 24,
              height: 24,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--r-sm)",
              border: "none",
              background: "transparent",
              color: "var(--fg-mute)",
              cursor: "pointer",
            }}
            className="hover:!bg-[var(--row-hover)] hover:!text-[var(--bad)]"
          >
            <Trash2Icon size={13} />
          </button>
        </div>
        <p
          style={{
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--fg)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            margin: 0,
          }}
        >
          {note.body}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "var(--r-pill)",
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              fontSize: 8.5,
              fontWeight: 700,
              color: "var(--fg-3)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {initials(authorLabel(note))}
          </span>
          <span style={{ fontSize: 11, color: "var(--fg-mute)" }}>
            {authorLabel(note)} · {timeAgo(note.created_at)}
          </span>
        </div>
      </div>
    );
    if (!clickable) return content;
    return (
      <Link
        href={note.path}
        onClick={() => setOpen(false)}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        {content}
      </Link>
    );
  }

  /* Grouped, active-only notes for the "all" tab */
  const activeAll = allNotes.filter((n) => !n.resolved);
  const byPath = new Map<string, PageNote[]>();
  for (const note of activeAll) {
    const list = byPath.get(note.path) ?? [];
    list.push(note);
    byPath.set(note.path, list);
  }

  const unresolved = pageNotes.filter((n) => !n.resolved);
  const resolved = pageNotes.filter((n) => n.resolved);

  return (
    <>
      {/* Floating corner button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={`Working notes (N)${activeCount ? ` · ${activeCount} active` : ""}`}
        aria-label="Working notes"
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          width: 40,
          height: 40,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "var(--r-pill)",
          background: activeCount ? "var(--accent)" : "var(--surface-raised)",
          border: `1px solid ${activeCount ? "var(--accent)" : "var(--line)"}`,
          color: activeCount ? "#fff" : "var(--fg-3)",
          cursor: "pointer",
          zIndex: 40,
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
        className="hover:!opacity-90"
      >
        <StickyNoteIcon size={17} strokeWidth={1.75} />
        {activeCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: "var(--r-pill)",
              background: "var(--warn)",
              color: "#fff",
              fontSize: 9.5,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--canvas, var(--bg))",
            }}
          >
            {activeCount}
          </span>
        )}
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Working notes"
        description={moduleDisplayName(pathname)}
        width={420}
      >
        {/* Tabs */}
        <div
          style={{
            display: "inline-flex",
            gap: 2,
            padding: 2,
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-sm)",
            marginBottom: 12,
          }}
        >
          {(["page", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                height: 24,
                padding: "0 10px",
                borderRadius: "var(--r-sm)",
                fontSize: 11.5,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                background: tab === t ? "var(--surface-raised)" : "transparent",
                color: tab === t ? "var(--fg)" : "var(--fg-mute)",
                boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {t === "page" ? `This page${activeCount ? ` (${activeCount})` : ""}` : "All notes"}
            </button>
          ))}
        </div>

        {tab === "page" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Composer */}
            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--surface)",
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 4 }}>
                {KIND_ORDER.map((kind) => {
                  const meta = KIND_META[kind];
                  const Icon = meta.icon;
                  const selected = newKind === kind;
                  return (
                    <button
                      key={kind}
                      onClick={() => setNewKind(kind)}
                      title={NOTE_KIND_LABELS[kind]}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        height: 24,
                        padding: "0 8px",
                        borderRadius: "var(--r-pill)",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: `1px solid ${selected ? meta.color : "var(--line)"}`,
                        background: selected ? meta.bg : "transparent",
                        color: selected ? meta.color : "var(--fg-mute)",
                      }}
                    >
                      <Icon size={12} strokeWidth={2} />
                      {NOTE_KIND_LABELS[kind]}
                    </button>
                  );
                })}
              </div>
              <textarea
                ref={bodyRef}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void handleAdd();
                }}
                placeholder={'e.g. "this should show up here…", "I\'d like to add…", "watch out, error here…"'}
                rows={3}
                style={{
                  resize: "none",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-sm)",
                  background: "var(--bg)",
                  color: "var(--fg)",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  padding: "8px 10px",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: "var(--fg-mute)" }}>⌘↵</span>
                <Button size="sm" onClick={() => void handleAdd()} disabled={saving || !newBody.trim()}>
                  {saving ? "…" : "Add"}
                </Button>
              </div>
            </div>

            {/* Active notes */}
            {unresolved.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--fg-mute)", textAlign: "center", padding: "16px 0", margin: 0 }}>
                No active notes on this page.
              </p>
            ) : (
              unresolved.map((note) => <div key={note.id}>{renderNote(note, false)}</div>)
            )}

            {/* Resolved, collapsed by default */}
            {resolved.length > 0 && (
              <div>
                <button
                  onClick={() => setShowResolved((v) => !v)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--fg-mute)",
                    fontSize: 11,
                    cursor: "pointer",
                    padding: "4px 0",
                  }}
                  className="hover:!text-[var(--fg-3)]"
                >
                  {showResolved ? "▾" : "▸"} Done ({resolved.length})
                </button>
                {showResolved && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                    {resolved.map((note) => <div key={note.id}>{renderNote(note, false)}</div>)}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {byPath.size === 0 ? (
              <p style={{ fontSize: 12, color: "var(--fg-mute)", textAlign: "center", padding: "16px 0", margin: 0 }}>
                {allLoaded ? "No active notes. Add one from any page." : "Loading…"}
              </p>
            ) : (
              Array.from(byPath.entries()).map(([path, notes]) => (
                <div key={path} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Link
                    href={path}
                    onClick={() => setOpen(false)}
                    title={path}
                    className="hover:!text-[var(--fg)]"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--fg-2)",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {moduleDisplayName(path)}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--fg-mute)",
                        background: "var(--surface-2)",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--r-pill)",
                        padding: "0 6px",
                      }}
                    >
                      {notes.length}
                    </span>
                  </Link>
                  {notes.map((note) => <div key={note.id}>{renderNote(note, true)}</div>)}
                </div>
              ))
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}
