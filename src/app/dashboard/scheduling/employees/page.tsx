"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Employee {
  id: string;
  fullName: string;
  email: string | null;
  baseSalaryMonthly: number;
}

export default function EmployeesPage() {
  const search = useSearchParams();
  const branchId = search.get("branch") ?? "";
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [salary, setSalary] = useState("30000");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const empRes = await fetch(
      branchId ? `/api/scheduling/employees?branchId=${encodeURIComponent(branchId)}` : "/api/scheduling/employees",
    );
    const empData = await empRes.json();
    setEmployees(empData.employees ?? []);
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async () => {
    setSaving(true);
    await fetch("/api/scheduling/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email: email.trim() ? email.trim() : null,
        baseSalaryMonthly: Number(salary),
        branchIds: branchId ? [branchId] : [],
      }),
    });
    setFullName("");
    setEmail("");
    setSalary("30000");
    await load();
    setSaving(false);
  };

  return (
    <section className="rounded-lg border border-border bg-card p-5 text-card-foreground">
      <h1 className="text-xl font-semibold">Employees</h1>
      <p className="text-sm text-muted-foreground">Manage fixed monthly salary for the selected location.</p>
      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <input className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <input className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" placeholder="Monthly salary" value={salary} onChange={(e) => setSalary(e.target.value)} />
        <button type="button" className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-muted disabled:opacity-50" onClick={onSave} disabled={saving || !fullName.trim()}>
          {saving ? "Saving..." : "Add employee"}
        </button>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Base salary</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="border-b border-border">
                <td className="py-2">{employee.fullName}</td>
                <td className="py-2">{employee.email ?? "-"}</td>
                <td className="py-2">{employee.baseSalaryMonthly.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
