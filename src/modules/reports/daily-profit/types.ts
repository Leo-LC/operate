export type FinanceScopeType = "group" | "location";
export type AllocationMethod = "direct" | "equal" | "revenue" | "custom";
export type CostCadence = "one_off" | "monthly" | "annual" | "custom";
export type ValueStatus = "estimated" | "actual";

export interface FinanceLegalEntity {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface FinanceLocation {
  id: string;
  name: string;
  legalEntityId: string | null;
  operationalStartDate: string | null;
}

export interface FinanceCostRule {
  id: string;
  organization_id: string;
  label: string;
  category: string;
  scope_type: FinanceScopeType;
  legal_entity_id: string | null;
  location_id: string | null;
  cadence: CostCadence;
  estimated_amount: number;
  effective_from: string;
  effective_to: string | null;
  allocation_method: AllocationMethod;
  custom_allocations: Record<string, number>;
  is_active: boolean;
  notes: string | null;
}

export interface FinanceCostActual {
  id: string;
  cost_rule_id: string | null;
  service_from: string;
  service_to: string;
  amount: number;
  paid_on: string | null;
}

export interface FinanceAdjustment {
  id: string;
  kind: "income" | "expense" | "reclassification";
  category: string;
  label: string;
  scope_type: FinanceScopeType;
  legal_entity_id: string | null;
  location_id: string | null;
  adjustment_date: string;
  amount: number;
  source_field: string | null;
  cost_rule_id: string | null;
  reason: string;
}

export interface FinancePayrollOverride {
  id: string;
  location_id: string | null;
  period_year: number;
  period_month: number;
  amount: number;
  value_status: ValueStatus;
}

export interface SourceDailyEntry {
  locationId: string;
  date: string;
  revenue: number;
  vat: number;
  directExpenses: number;
  hrCash: number;
  cashIn: number;
}

export interface FinanceShopMonthlyInput {
  id: string;
  location_id: string;
  period_year: number;
  period_month: number;
  salaries_amount: number;
  rent_amount: number;
  electricity_amount: number;
  water_amount: number;
  other_fixed_amount: number;
  service_charge_rate_pct: number;
  employee_count: number;
}

export interface PayrollPeriod {
  locationId: string;
  year: number;
  month: number;
  amount: number;
  status: ValueStatus;
}

export interface DailyProfitRow {
  date: string;
  revenue: number;
  directExpenses: number;
  payroll: number;
  recurringCosts: number;
  serviceCharge: number;
  adjustments: number;
  economicProfit: number;
  margin: number;
  cashIn: number;
  cashOut: number;
  estimatedAmount: number;
  status: ValueStatus;
}

export interface ScopeProfitRow {
  id: string;
  name: string;
  revenue: number;
  costs: number;
  economicProfit: number;
  margin: number;
  estimatedAmount: number;
}

export interface CategoryProfitRow {
  key: string;
  label: string;
  amount: number;
  status: ValueStatus;
}

export interface DailyProfitResponse {
  period: { from: string; to: string };
  asOf: string;
  scope: { type: FinanceScopeType; id: string | null; label: string };
  canManage: boolean;
  legalEntities: FinanceLegalEntity[];
  locations: FinanceLocation[];
  summary: {
    revenue: number;
    directExpenses: number;
    payroll: number;
    recurringCosts: number;
    serviceCharge: number;
    adjustments: number;
    totalCosts: number;
    economicProfit: number;
    margin: number;
    cashIn: number;
    cashOut: number;
    netCash: number;
    estimatedAmount: number;
  };
  daily: DailyProfitRow[];
  byScope: ScopeProfitRow[];
  categories: CategoryProfitRow[];
  coverage: {
    score: number;
    mirrorActive: boolean;
    latestSheetDate: string | null;
    lastSyncAt: string | null;
    payrollEstimatedMonths: number;
    missingCostSetup: string[];
    warnings: string[];
  };
  methodology: {
    version: string;
    formula: string;
    revenueFields: readonly string[];
    expenseFields: readonly string[];
    excludedFields: readonly string[];
    rules: readonly string[];
    shopSettings: Array<{
      locationId: string;
      locationName: string;
      period: string;
      salaries: number;
      rent: number;
      electricity: number;
      water: number;
      otherFixed: number;
      serviceChargeRatePct: number;
      employeeCount: number;
    }>;
  };
}

export interface EngineInput {
  from: string;
  to: string;
  selectedLocationIds: string[];
  locations: FinanceLocation[];
  entries: SourceDailyEntry[];
  monthlyInputs: FinanceShopMonthlyInput[];
}

export interface EngineOutput {
  dailyByLocation: Map<string, Map<string, DailyProfitRow>>;
  categories: CategoryProfitRow[];
}
