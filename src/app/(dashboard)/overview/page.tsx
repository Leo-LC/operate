import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ShopSummaryCard } from "@/modules/overview/components/ShopSummaryCard";
import { ViewerDashboard } from "@/modules/overview/components/ViewerDashboard";
import type { ShopCard } from "@/app/api/overview/cards/route";

async function fetchCards(baseUrl: string, cookie: string): Promise<ShopCard[]> {
  const res = await fetch(`${baseUrl}/api/overview/cards`, {
    headers: { cookie },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json() as { cards: ShopCard[] };
  return json.cards ?? [];
}

export default async function OverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const role = session.user.role;
  if (role === "direction") {
    return <ViewerDashboard name={session.user.name ?? session.user.email ?? ""} />;
  }
  if (role !== "owner") redirect("/home");

  const { headers } = await import("next/headers");
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const cookie = headersList.get("cookie") ?? "";
  const baseUrl = `${protocol}://${host}`;

  const cards = await fetchCards(baseUrl, cookie);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--fg-4)]">{dateLabel}</span>
        <h1 className="text-2xl font-semibold text-[var(--fg)]">{greeting}.</h1>
        <p className="text-sm text-[var(--fg-3)]">What needs your attention today.</p>
      </div>

      {/* Shop cards */}
      {cards.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]">
          <span className="text-sm text-[var(--fg-4)]">No active shops found.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <ShopSummaryCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
