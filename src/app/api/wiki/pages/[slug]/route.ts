import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { resolveWikiRole } from "@/lib/wiki-helpers";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("wiki_pages")
    .select("*, wiki_categories(id, name, slug)")
    .eq("org_id", DEFAULT_ORG_ID)
    .eq("slug", params.slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(
  req: Request,
  { params }: { params: { slug: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wikiRole = await resolveWikiRole(session.user.email, session.user.role as "owner" | "staff" | undefined);
  if (wikiRole !== "editor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { title, slug, content, content_type, category_id } = body;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("wiki_pages")
    .update({
      title,
      slug,
      content,
      content_type,
      category_id: category_id || null,
      updated_by: session.user.email,
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", DEFAULT_ORG_ID)
    .eq("slug", params.slug)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "A page with this slug already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wikiRole = await resolveWikiRole(session.user.email, session.user.role as "owner" | "staff" | undefined);
  if (wikiRole !== "editor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("wiki_pages")
    .delete()
    .eq("org_id", DEFAULT_ORG_ID)
    .eq("slug", params.slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
