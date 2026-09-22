import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { isOperationalAdmin } from "@/core/permissions/guards";
import {
  BUILTIN_DOC_TYPES,
  BUILTIN_DOC_TYPE_LABELS,
  getDocTypeLabel,
} from "@/modules/admin/lib/employee-documents";

/**
 * Shared document categories: builtins + custom slugs already used by any
 * employee (distinct doc_type values). Lets staff reuse a category created
 * by someone else instead of retyping it.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("employee_documents")
    .select("doc_type")
    .eq("organization_id", DEFAULT_ORG_ID);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const builtinSet = new Set<string>(BUILTIN_DOC_TYPES as readonly string[]);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ doc_type: string }>) {
    if (builtinSet.has(row.doc_type) || row.doc_type === "other" || !row.doc_type) continue;
    counts.set(row.doc_type, (counts.get(row.doc_type) ?? 0) + 1);
  }

  return Response.json({
    builtins: (BUILTIN_DOC_TYPES as readonly string[]).map((slug) => ({
      slug,
      label: BUILTIN_DOC_TYPE_LABELS[slug as keyof typeof BUILTIN_DOC_TYPE_LABELS],
    })),
    custom: Array.from(counts.entries())
      .map(([slug, count]) => ({ slug, label: getDocTypeLabel(slug), count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  });
}
