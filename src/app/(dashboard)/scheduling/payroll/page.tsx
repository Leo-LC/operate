"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface RecapRow {
  employeeId: string;
  employeeName: string;
  overtimeHours: number;
  missedHours: number;
  netHoursDelta: number;
  baseHourly: number;
  overtimeAmount: number;
  deductionAmount: number;
  netAdjustmentAmount: number;
}

export default function PayrollPage() {
  const search = useSearchParams();
  const branchId = search.get("branch") ?? "";
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [rows, setRows] = useState<RecapRow[]>([]);
  const [settings, setSettings] = useState<{ standardHoursPerMonth: number; overtimeMultiplier: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!branchId) return;
      const res = await fetch(`/api/scheduling/payroll/monthly?branchId=${branchId}&month=${month}`);
      const data = await res.json();
      setRows(data.recap ?? []);
      setSettings(data.settings ?? null);
    };
    void load();
  }, [branchId, month]);

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5 text-card-foreground">
      <div>
        <h1 className="text-xl font-semibold">Monthly Payroll Recap</h1>
        <p className="text-sm text-muted-foreground">
          Base salary is fixed; this section computes overtime/missed-hour payment adjustments.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <input type="month" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      {settings && (
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-md border border-border bg-background p-2 text-sm">
            Standard hours/month: <strong>{settings.standardHoursPerMonth}</strong>
          </div>
          <div className="rounded-md border border-border bg-background p-2 text-sm">
            Overtime multiplier: <strong>{settings.overtimeMultiplier}x</strong>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2">Employee</th>
              <th className="py-2">OT h</th>
              <th className="py-2">Missed h</th>
              <th className="py-2">Net h</th>
              <th className="py-2">Base hourly</th>
              <th className="py-2">OT amount</th>
              <th className="py-2">Deduction</th>
              <th className="py-2">Net adj.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employeeId} className="border-b border-border">
                <td className="py-2">{row.employeeName}</td>
                <td className="py-2">{row.overtimeHours}</td>
                <td className="py-2">{row.missedHours}</td>
                <td className="py-2">{row.netHoursDelta}</td>
                <td className="py-2">{row.baseHourly}</td>
                <td className="py-2">{row.overtimeAmount}</td>
                <td className="py-2">{row.deductionAmount}</td>
                <td className="py-2 font-semibold">{row.netAdjustmentAmount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
