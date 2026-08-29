export type CatalogRelevance = "high" | "medium" | "low";

export interface CatalogEndpoint {
  id: string;
  path: string;
  label: string;
  description: string;
  relevance: CatalogRelevance;
  listKey?: string;
  supportsDateFilter?: boolean;
  supportsStoreFilter?: boolean;
}

export interface LoyverseStore {
  id: string;
  name: string;
  address?: string | null;
}

export interface LoyverseCategory {
  id: string;
  name: string;
}

export interface LoyverseItem {
  id: string;
  item_name: string;
  category_id?: string | null;
}

export interface LoyversePaymentType {
  id: string;
  name: string;
  type: string;
}

export interface LoyverseLineItem {
  item_id?: string;
  item_name?: string;
  quantity?: number;
  total_money?: number;
}

export interface LoyversePayment {
  payment_type_id?: string;
  name?: string;
  type?: string;
  money_amount?: number;
}

export interface LoyverseReceipt {
  receipt_number: string;
  receipt_type: "SALE" | "REFUND" | string;
  receipt_date?: string;
  created_at?: string;
  store_id?: string;
  total_money?: number;
  total_tax?: number;
  surcharge?: number;
  cancelled_at?: string | null;
  line_items?: LoyverseLineItem[];
  payments?: LoyversePayment[];
}

export type SalesBucket = "drinks" | "ticket" | "snack" | "goodies" | "surcharge" | "other";

export type PaymentBucket = "cash" | "scan" | "credit_card" | "other";

export interface ProposedDailyEntry {
  sales_drinks_net: number;
  sales_ticket_net: number;
  sales_snack_net: number;
  sales_goodies_net: number;
  sales_card_surcharge: number;
  vat_7: number;
  payment_cash: number;
  payment_scan: number;
  payment_credit_card: number;
}

export interface ProposedChallengeEntry {
  entry_count: number;
  snacks_sold: number;
  tickets_sold: number;
}

export interface AggregationMeta {
  receipt_count: number;
  sale_count: number;
  refund_count: number;
  cancelled_count: number;
  unmapped_line_items: number;
  unmapped_payments: number;
}

export interface DailySummaryResult {
  date: string;
  store_id: string;
  location_id: string | null;
  location_name: string | null;
  proposed: ProposedDailyEntry;
  challenges: ProposedChallengeEntry;
  meta: AggregationMeta;
  existing_entry: Record<string, number | string | null> | null;
  field_diffs: FieldDiff[];
  coverage: CoverageResult;
}

export interface FieldDiff {
  field: string;
  label: string;
  proposed: number | null;
  existing: number | null;
  delta: number | null;
  auto_fillable: boolean;
}

export interface CoverageResult {
  auto_fillable_count: number;
  total_trackable: number;
  percent: number;
  auto_fillable_fields: string[];
  manual_fields: string[];
}

export interface DemoDayResult {
  date: string;
  coverage_percent: number;
  receipt_count: number;
  has_existing_entry: boolean;
}

export interface DemoReportResult {
  store_id: string;
  location_id: string | null;
  location_name: string | null;
  days: DemoDayResult[];
  average_coverage_percent: number;
  challenges_automated: string[];
}

export type EndpointNoteStatus = "useful" | "useless" | "needs_mapping" | "unset";

export interface EndpointNote {
  endpointId: string;
  status: EndpointNoteStatus;
  note: string;
}
