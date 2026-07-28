import { requireCustomerInsightsPage } from "@/modules/customer-insights/lib/page-guard";
import { CustomerInsightsClient } from "@/modules/customer-insights/components/CustomerInsightsClient";

export default async function CustomerInsightsPage() {
  await requireCustomerInsightsPage();
  return <CustomerInsightsClient />;
}
