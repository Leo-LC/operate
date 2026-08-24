import { requireLoyverseOwner } from "@/modules/loyverse/lib/guard";
import { isWriteBackEnabled, writeBackForDate } from "@/modules/loyverse/lib/write-back";

function bangkokToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const guard = await requireLoyverseOwner();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const date: string = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : bangkokToday();
  const dryRun: boolean = body.dryRun === true;
  const force: boolean = body.force === true;
  const confirmText: string | undefined = typeof body.confirmText === "string" ? body.confirmText : undefined;

  // Env flag check — owner can force-bypass after double confirmation
  if (!force && !isWriteBackEnabled()) {
    return Response.json(
      {
        error: "LOYVERSE_WRITE_ENABLED is false — Phase 4 est OFF. Utilise le bouton Admin avec double confirmation (force=true) pour activer manuellement.",
        enabled: false,
        hint: "Ajoute LOYVERSE_WRITE_ENABLED=true dans Vercel env pour activer globalement, ou passe force=true via l'Admin.",
      },
      { status: 403 },
    );
  }

  // Second confirmation guard: when force=true, require explicit confirmText
  if (force && confirmText !== "ACTIVER") {
    return Response.json(
      { error: "Confirmation manquante — tape ACTIVER pour confirmer l'écriture.", required: "ACTIVER" },
      { status: 400 },
    );
  }

  try {
    const result = await writeBackForDate(date, { dryRun, force: true });
    return Response.json({ ...result, date, dryRun, forced: force });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const guard = await requireLoyverseOwner();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? bangkokToday();
  const enabled = isWriteBackEnabled();

  return Response.json({
    enabled,
    date,
    message: enabled
      ? "LOYVERSE_WRITE_ENABLED=true — write-back actif (Phase 4 ON)."
      : "LOYVERSE_WRITE_ENABLED != true — Phase 4 OFF. Écriture désactivée sauf via Admin force.",
    hint: "POST /api/loyverse/write-back { date, dryRun, force, confirmText:'ACTIVER' } (owner only)",
  });
}
