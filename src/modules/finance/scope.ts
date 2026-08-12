export const FINANCE_SCOPE_STORAGE_KEY = "operate.finance.scope.v1";

export type FinanceScope = { type: "group" | "location"; locationId: string };

export const DEFAULT_FINANCE_SCOPE: FinanceScope = { type: "group", locationId: "" };
