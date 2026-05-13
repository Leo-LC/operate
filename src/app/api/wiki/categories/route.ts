import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { resolveWikiRole } from "@/lib/wiki-helpers";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("wiki_categories")
    .select("*")
    .eq("org_id", DEFAULT_ORG_ID)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wikiRole = await resolveWikiRole(session.user.email, session.user.role as "owner" | "staff" | undefined);
  if (wikiRole !== "editor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, slug } = await req.json();
  if (!name || !slug) return NextResponse.json({ error: "name and slug are required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("wiki_categories")
    .insert({ org_id: DEFAULT_ORG_ID, name, slug })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
