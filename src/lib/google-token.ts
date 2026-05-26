import { getSupabaseServerClient } from "./supabase-server";

export async function saveGoogleTokensToOrg(
  refreshToken: string,
  accessToken: string,
  expiresAt: number,
) {
  try {
    const supabase = getSupabaseServerClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (!org?.id) return;
    await supabase.from("organizations").update({
      google_refresh_token: refreshToken,
      google_access_token: accessToken,
      google_token_expires_at: expiresAt,
    }).eq("id", org.id);
  } catch {
    // Non-fatal — token will be refreshed on next API call
  }
}

export async function getOrganizationAccessToken(): Promise<string | null> {
  try {
    const supabase = getSupabaseServerClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("google_refresh_token, google_access_token, google_token_expires_at")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!org?.google_refresh_token) return null;

    const expiresAt = org.google_token_expires_at as number | null;
    if (org.google_access_token && expiresAt && Date.now() < expiresAt - 60_000) {
      return org.google_access_token as string;
    }

    // Refresh the access token
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: org.google_refresh_token as string,
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { access_token: string; expires_in: number };
    const newExpiry = Date.now() + data.expires_in * 1000;

    // Persist refreshed token
    const { data: orgForUpdate } = await supabase
      .from("organizations")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (orgForUpdate?.id) {
      await supabase.from("organizations").update({
        google_access_token: data.access_token,
        google_token_expires_at: newExpiry,
      }).eq("id", orgForUpdate.id);
    }

    return data.access_token;
  } catch {
    return null;
  }
}
