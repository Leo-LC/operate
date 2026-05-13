"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import dynamic from "next/dynamic";
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Quote, Code, Minus, LinkIcon, ArrowLeftIcon, SaveIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { WikiCategory, WikiContentType, WikiPage } from "../types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

interface Props {
  page?: WikiPage & { wiki_categories: WikiCategory | null };
  categories: WikiCategory[];
  mode: "create" | "edit";
}

function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`rounded p-1.5 transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function WikiEditorClient({ page, categories, mode }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!page?.slug);
  const [categoryId, setCategoryId] = useState(page?.category_id ?? "");
  const [contentType, setContentType] = useState<WikiContentType>(page?.content_type ?? "richtext");
  const [htmlContent, setHtmlContent] = useState(page?.content_type === "html" ? (page.content ?? "") : "");
  const [htmlPreviewKey, setHtmlPreviewKey] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);

  // TipTap editor (richtext mode)
  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write something…" }),
    ],
    content: page?.content_type === "richtext" ? (page.content ?? "") : "",
    immediatelyRender: false,
  });

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slugManual) setSlug(slugify(val));
  }

  function handleSlugChange(val: string) {
    setSlug(slugify(val));
    setSlugManual(true);
  }

  function switchContentType(next: WikiContentType) {
    if (next === contentType) return;
    const hasContent = contentType === "richtext"
      ? (editor?.getText().trim() ?? "").length > 0
      : htmlContent.trim().length > 0;

    if (hasContent && !confirm("Switching editor mode will clear the current content. Continue?")) return;

    if (next === "richtext") {
      editor?.commands.setContent("");
      setHtmlContent("");
    } else {
      editor?.commands.clearContent();
      setHtmlContent("");
    }
    setContentType(next);
  }

  const handleSave = useCallback(async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!slug.trim()) { toast.error("Slug is required"); return; }

    const content = contentType === "richtext"
      ? (editor?.getHTML() ?? "")
      : htmlContent;

    setSaving(true);
    const url = mode === "create" ? "/api/wiki/pages" : `/api/wiki/pages/${page!.slug}`;
    const method = mode === "create" ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug, content, content_type: contentType, category_id: categoryId || null }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error(json.error ?? "Failed to save");
      setSaving(false);
      return;
    }

    toast.success(mode === "create" ? "Page created" : "Page saved");
    router.push(`/dashboard/wiki/${json.slug ?? slug}`);
    router.refresh();
  }, [title, slug, contentType, htmlContent, categoryId, editor, mode, page, router]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={page ? `/dashboard/wiki/${page.slug}` : "/dashboard/wiki"}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="size-3" />
          {page ? "Back to page" : "Back to wiki"}
        </Link>
        <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
          <SaveIcon className="size-3.5" />
          {saving ? "Saving…" : mode === "create" ? "Create page" : "Save changes"}
        </Button>
      </div>

      {/* Metadata fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Page title"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="page-slug"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content type toggle */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Content type</label>
        <div className="inline-flex rounded-lg border border-border bg-muted p-1 gap-1">
          <button
            type="button"
            onClick={() => switchContentType("richtext")}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
              contentType === "richtext"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Rich Text
          </button>
          <button
            type="button"
            onClick={() => switchContentType("html")}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
              contentType === "html"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Custom HTML
          </button>
        </div>
      </div>

      {/* Editor area */}
      {contentType === "richtext" ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* TipTap toolbar */}
          <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-3 py-2">
            <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")}>
              <Bold className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")}>
              <Italic className="size-3.5" />
            </ToolbarButton>
            <div className="mx-1 h-4 w-px bg-border" />
            <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })}>
              <Heading2 className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })}>
              <Heading3 className="size-3.5" />
            </ToolbarButton>
            <div className="mx-1 h-4 w-px bg-border" />
            <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")}>
              <List className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")}>
              <ListOrdered className="size-3.5" />
            </ToolbarButton>
            <div className="mx-1 h-4 w-px bg-border" />
            <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")}>
              <Quote className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive("code")}>
              <Code className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
              <Minus className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                const url = prompt("Enter URL:");
                if (url) editor?.chain().focus().setLink({ href: url }).run();
              }}
              active={editor?.isActive("link")}
            >
              <LinkIcon className="size-3.5" />
            </ToolbarButton>
          </div>
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none dark:prose-invert min-h-[400px] px-6 py-4
              prose-headings:font-serif prose-headings:text-foreground
              prose-p:text-foreground/85 prose-p:leading-relaxed
              prose-a:text-[#B9854E]
              prose-blockquote:border-l-[#B9854E] prose-blockquote:text-muted-foreground
              prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              [&_.ProseMirror]:outline-none
              [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
              [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground/40
              [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none
              [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left"
          />
        </div>
      ) : (
        /* HTML mode: Monaco + preview */
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Write raw HTML/CSS. Rendered in a sandboxed iframe.
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Preview</span>
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${showPreview ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${showPreview ? "translate-x-4" : ""}`} />
              </button>
            </div>
          </div>
          <div className={`grid gap-3 ${showPreview ? "md:grid-cols-2" : "grid-cols-1"}`}>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">HTML editor</span>
              </div>
              <MonacoEditor
                height="500px"
                language="html"
                value={htmlContent}
                onChange={(val) => {
                  setHtmlContent(val ?? "");
                  setHtmlPreviewKey((k) => k + 1);
                }}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  formatOnPaste: true,
                }}
              />
            </div>
            {showPreview && (
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="border-b border-border bg-card px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">Preview</span>
                </div>
                <iframe
                  key={htmlPreviewKey}
                  srcDoc={htmlContent || "<p style='color:#999;font-family:sans-serif;padding:1rem'>Start typing HTML…</p>"}
                  sandbox="allow-scripts allow-same-origin"
                  className="w-full border-0"
                  style={{ height: "468px" }}
                  title="HTML preview"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
