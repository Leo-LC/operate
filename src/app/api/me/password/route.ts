import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import bcrypt from "bcryptjs";
import { encryptPassword } from "@/lib/password-crypto";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const password = body.password?.trim();
  if (!password || password.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const password_hash = await bcrypt.hash(password, 10);
  let updates: Record<string, unknown> = {
    password_hash,
    updated_at: new Date().toISOString(),
  };
  try {
    updates["assigned_password_encrypted" as string] = encryptPassword(password);
  } catch {
    // if encryption fails, continue without it
  }

  const { error } = await supabase.from("users").update(updates).eq("id", session.user.userId);
  if (error) {
    // fallback if assigned_password_encrypted column missing
    if (error.message?.includes("assigned_password_encrypted")) {
      delete (updates as Record<string, unknown>).assigned_password_encrypted;
      const retry = await supabase.from("users").update(updates).eq("id", session.user.userId);
      if (retry.error) return Response.json({ error: retry.error.message }, { status: 500 });
    } else {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json({ ok: true });
}
