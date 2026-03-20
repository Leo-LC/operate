import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { REVIEWS_BASE } from "@/lib/constants";
import { getPreferredAccountId } from "@/lib/google-business";

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  const token = await getToken({
    req: request as unknown as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });
  const accessToken = (token as { accessToken?: string } | null)?.accessToken;
  if (!accessToken || !session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { locationName: string; reviewId: string; comment: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { locationName, reviewId, comment } = body;
  if (!locationName || !reviewId || typeof comment !== "string") {
    return Response.json(
      { error: "Missing locationName, reviewId, or comment" },
      { status: 400 }
    );
  }

  try {
    const accountId = await getPreferredAccountId(accessToken);
    const url = `${REVIEWS_BASE}/accounts/${accountId}/${locationName}/reviews/${reviewId}/reply`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment }),
    });

    if (!res.ok) {
      const err = await res.text();
      const status = res.status >= 500 ? 502 : 400;
      const message =
        res.status === 401
          ? "Unauthorized with Google Business Profile API."
          : `Reply failed with status ${res.status}.`;
      console.error("[reply] upstream error", { status: res.status, body: err });
      return Response.json({ error: message }, { status });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error("[reply] handler error", e);
    const message = e instanceof Error ? e.message : "Reply failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
