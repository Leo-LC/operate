import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { REVIEWS_BASE } from "@/lib/constants";

async function getFirstAccountId(accessToken: string): Promise<string> {
  const res = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Accounts API error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    accounts?: { name?: string | null; accountName?: string | null }[];
  };
  const accounts = data.accounts ?? [];
  if (accounts.length === 0) {
    throw new Error("No Business Profile accounts found for this Google user.");
  }
  if (accounts.length > 1) {
    const names = accounts
      .map((a) => a.accountName || a.name || "unknown")
      .slice(0, 3)
      .join(", ");
    throw new Error(
      `Multiple Business Profile accounts found (${names}). This app currently supports one account per user.`
    );
  }
  const name = accounts[0].name;
  if (!name || !name.startsWith("accounts/")) {
    throw new Error("Unexpected account format returned by Business Profile API.");
  }
  return name.replace("accounts/", "");
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  if (!accessToken) {
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
    const accountId = await getFirstAccountId(accessToken);
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
      return Response.json(
        { error: `Reply failed: ${res.status} ${err}` },
        { status: res.status >= 500 ? 502 : 400 }
      );
    }

    console.log(
      "[reply]",
      JSON.stringify({
        userEmail: session?.user?.email ?? null,
        locationName,
        reviewId,
      })
    );

    return Response.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reply failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
