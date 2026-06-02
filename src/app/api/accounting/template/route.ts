import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { IMPORT_COLUMNS } from "@/app/api/accounting/import/columns";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "accounting"))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const locationName = searchParams.get("location_name") ?? "Your Location Name";

  const headers = IMPORT_COLUMNS.map((c) => c.csv).join(",");

  // Hint row: real date format, zeros for all numeric fields, placeholder notes
  // Decimals use dot notation (e.g. 1234.50). Both dot and comma are accepted on import.
  const hintValues = IMPORT_COLUMNS.map((c) => {
    if (c.csv === "date")  return "YYYY-MM-DD";
    if (c.csv === "notes") return "optional text";
    return "0";
  });

  // Example row so the date format is crystal-clear
  const exampleValues = IMPORT_COLUMNS.map((c) => {
    if (c.csv === "date")  return "2026-01-15";
    if (c.csv === "notes") return "";
    return "0";
  });

  const csv = [
    `# Import template for: ${locationName}`,
    `# - date column: YYYY-MM-DD format (e.g. 2026-01-15)`,
    `# - numeric columns: use dot OR comma as decimal separator (e.g. 1234.50 or 1234,50)`,
    `# - uploading will OVERWRITE existing entries for the same date`,
    `# - delete this comment block before uploading, or leave it — it will be ignored`,
    headers,
    hintValues.join(","),
    exampleValues.join(","),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="accounting-import-template.csv"`,
    },
  });
}
