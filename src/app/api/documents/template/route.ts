import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";

const HEADERS = [
  "location_name",
  "title",
  "code",
  "thai_form_name",
  "category",
  "document_type",
  "authority",
  "frequency",
  "is_relevant",
  "has_document",
  "issued_at",
  "expires_at",
  "notes",
  "shop_notes",
  "drive_url",
];

const EXAMPLE_ROW = [
  "Main Branch",
  "Business License",
  "BIZ-001",
  "ใบอนุญาตประกอบธุรกิจ",
  "Legal",
  "license",
  "Department of Business Development",
  "annual",
  "yes",
  "yes",
  "2024-01-15",
  "2025-01-14",
  "Original stored in office safe",
  "",
  "",
];

const INSTRUCTIONS_ROW = [
  "Must match a location name exactly",
  "Required",
  "Optional unique code",
  "Optional Thai name",
  "Optional grouping",
  "permit|license|certificate|contract|insurance|health|legal|hr|other",
  "Optional issuing authority",
  "Optional e.g. annual",
  "yes or no (default: yes)",
  "yes or no (default: no)",
  "YYYY-MM-DD or blank",
  "YYYY-MM-DD or blank",
  "Optional notes",
  "Optional shop-specific notes",
  "Optional Google Drive URL",
];

function csvRow(cells: string[]): string {
  return cells
    .map((c) => {
      if (c.includes(",") || c.includes('"') || c.includes("\n")) {
        return `"${c.replace(/"/g, '""')}"`;
      }
      return c;
    })
    .join(",");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "documents")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const csv = [
    csvRow(HEADERS),
    csvRow(INSTRUCTIONS_ROW),
    csvRow(EXAMPLE_ROW),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="documents-import-template.csv"',
    },
  });
}
