"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { PencilIcon, Trash2Icon, ChevronRightIcon, ArrowLeftIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import type { WikiPage, WikiCategory } from "../types";

// TipTap's ProseMirror schema strips unsupported marks/nodes automatically.
// This is safe for internal authenticated users — richtext content is always
// produced by TipTap itself, so malicious HTML cannot be stored via the editor.

interface Props {
  page: WikiPage & { wiki_categories: WikiCategory | null };
  // Pre-sanitized on the server (server page runs DOMPurify before passing)
  sanitizedContent: string;
  isEditor: boolean;
}

function RichTextViewer({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: false,
    immediatelyRender: false,
  });
  return (
    <EditorContent
      editor={editor}
      className="prose prose-sm max-w-none dark:prose-invert
        prose-headings:font-serif prose-headings:text-foreground
        prose-p:text-foreground/85 prose-p:leading-relaxed
        prose-a:text-[#B9854E] prose-a:no-underline hover:prose-a:underline
        prose-blockquote:border-l-[#B9854E] prose-blockquote:text-muted-foreground
        prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
        prose-pre:bg-muted prose-pre:text-foreground
        prose-hr:border-border [&_.ProseMirror]:outline-none"
    />
  );
}

export function WikiPageClient({ page, sanitizedContent, isEditor }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${page.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/wiki/pages/${page.slug}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Page deleted");
      router.push("/dashboard/wiki");
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Failed to delete page");
      setDeleting(false);
    }
  }

  const category = page.wiki_categories;

  return (
    <div className="mx-auto max-w-[720px] space-y-8">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/dashboard/wiki" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeftIcon className="size-3" />
            Wiki
          </Link>
          {category && (
            <>
              <ChevronRightIcon className="size-3 opacity-40" />
              <span className="text-[#B9854E] font-medium">{category.name}</span>
            </>
          )}
          <ChevronRightIcon className="size-3 opacity-40" />
          <span className="text-foreground/60 truncate max-w-[200px]">{page.title}</span>
        </nav>

        {isEditor && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Link href={`/dashboard/wiki/${page.slug}/edit`} className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1.5 text-xs" })}>
              <PencilIcon className="size-3" />
              Edit
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2Icon className="size-3" />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        )}
      </div>

      {/* Page header */}
      <div className="border-b border-border pb-6">
        <h1 className="font-serif text-3xl font-medium text-foreground leading-tight">{page.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {category && (
            <span className="rounded-full bg-[#B9854E]/10 px-2.5 py-1 text-[#B9854E] font-medium">
              {category.name}
            </span>
          )}
          <span>
            Updated{" "}
            {new Date(page.updated_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          {page.updated_by && <span>by {page.updated_by.split("@")[0]}</span>}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[200px]">
        {!page.content ? (
          <p className="text-sm text-muted-foreground italic">This page has no content yet.</p>
        ) : (
          <RichTextViewer content={sanitizedContent} />
        )}
      </div>
    </div>
  );
}
