import { requireCustomerInsightsPage } from "@/modules/customer-insights/lib/page-guard";
import { CustomerInsightsClient } from "@/modules/customer-insights/components/CustomerInsightsClient";
import "./customer-insights.css";

export default async function CustomerInsightsPage() {
  await requireCustomerInsightsPage();
  return <CustomerInsightsClient />;
}
