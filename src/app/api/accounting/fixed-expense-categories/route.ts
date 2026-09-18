import { NextResponse } from "next/server";

// Déprécié (F) : les catégories legacy fixed_expense_categories sont remplacées par
// recurring_cost_categories (source unique). Voir GET /api/finance/cost-categories.
const GONE = () =>
  NextResponse.json(
    { error: "Gone — utilisez /api/finance/cost-categories (recurring_cost_categories)." },
    { status: 410 },
  );

export async function GET() {
  return GONE();
}

export async function POST() {
  return GONE();
}

export async function DELETE() {
  return GONE();
}
