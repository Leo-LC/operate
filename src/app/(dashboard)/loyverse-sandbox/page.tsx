import { LoyverseSandboxClient } from "@/modules/loyverse-sandbox/components/LoyverseSandboxClient";
import { requireLoyverseSandboxPage } from "@/modules/loyverse-sandbox/lib/page-guard";

export default async function LoyverseSandboxPage() {
  await requireLoyverseSandboxPage();
  return <LoyverseSandboxClient />;
}
