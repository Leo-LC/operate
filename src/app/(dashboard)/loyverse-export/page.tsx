import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LoyverseExportClient } from "@/modules/loyverse-export/components/LoyverseExportClient";

export default async function LoyverseExportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  // Shops + ranges are loaded client-side from the Loyverse APIs
  // (same source as the former Accounting "Copy" tab).
  return <LoyverseExportClient />;
}
