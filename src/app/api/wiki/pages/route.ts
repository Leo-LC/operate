import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { resolveWikiRole } from "@/lib/wiki-helpers";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const categoryId = searchParams.get("category_id") ?? "";

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("wiki_pages")
    .select("id, org_id, title, slug, content_type, category_id, created_by, updated_by, created_at, updated_at, wiki_categories(id, name, slug)")
    .eq("org_id", DEFAULT_ORG_ID)
    .order("title", { ascending: true });

  if (search) query = query.ilike("title", `%${search}%`);
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wikiRole = await resolveWikiRole(session.user.email, session.user.role as "owner" | "staff" | undefined);
  if (wikiRole !== "editor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { title, slug, content, content_type, category_id } = body;
  if (!title || !slug || !content_type) {
    return NextResponse.json({ error: "title, slug, and content_type are required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("wiki_pages")
    .insert({
      org_id: DEFAULT_ORG_ID,
      title,
      slug,
      content: content ?? "",
      content_type,
      category_id: category_id || null,
      created_by: session.user.email,
      updated_by: session.user.email,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "A page with this slug already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
