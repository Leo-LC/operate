"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Adjustment {
  id: string;
  employeeId: string;
  date: string;
  type: "overtime" | "missed_undertime";
  hours: number;
  note: string | null;
}

export default function AdjustmentsPage() {
  const search = useSearchParams();
  const branchId = search.get("branch") ?? "";
  const [employees, setEmployees] = useState<{ id: string; fullName: string }[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [type, setType] = useState<"overtime" | "missed_undertime">("overtime");
  const [hours, setHours] = useState("2");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Adjustment[]>([]);

  const loadSeed = async (targetBranchId: string) => {
    if (!targetBranchId) return;
    const eRes = await fetch(`/api/scheduling/employees?branchId=${encodeURIComponent(targetBranchId)}`);
    const eData = await eRes.json();
    const employeeList = eData.employees ?? [];
    setEmployees(employeeList);
    if (employeeList[0]) setEmployeeId(employeeList[0].id);
  };

  const loadRows = async (targetBranchId: string) => {
    if (!targetBranchId) return;
    const month = format(new Date(), "yyyy-MM");
    const res = await fetch(`/api/scheduling/adjustments?branchId=${targetBranchId}&month=${month}`);
    const data = await res.json();
    setRows(data.adjustments ?? []);
  };

  useEffect(() => {
    void loadSeed(branchId);
    void loadRows(branchId);
  }, [branchId]);

  const onSave = async () => {
    await fetch("/api/scheduling/adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, employeeId, date, type, hours: Number(hours), note: note.trim() ? note.trim() : null }),
    });
    setHours("2");
    setNote("");
    await loadRows(branchId);
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5 text-card-foreground">
      <div>
        <h1 className="text-xl font-semibold">Overtime / Missed Hours</h1>
        <p className="text-sm text-muted-foreground">Manual entries by employee + branch + date.</p>
      </div>
      <div className="grid gap-2 md:grid-cols-5">
        <select className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.fullName}
            </option>
          ))}
        </select>
        <input type="date" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        <select className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" value={type} onChange={(e) => setType(e.target.value as "overtime" | "missed_undertime")}>
          <option value="overtime">Overtime</option>
          <option value="missed_undertime">Missed/Undertime</option>
        </select>
        <input className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Hours" />
        <button type="button" className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-muted" onClick={onSave}>
          Add entry
        </button>
      </div>
      <input className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note (e.g. manager exception)" />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2">Date</th>
              <th className="py-2">Employee</th>
              <th className="py-2">Type</th>
              <th className="py-2">Hours</th>
              <th className="py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border">
                <td className="py-2">{row.date}</td>
                <td className="py-2">{employees.find((e) => e.id === row.employeeId)?.fullName ?? row.employeeId}</td>
                <td className="py-2">{row.type}</td>
                <td className="py-2">{row.hours}</td>
                <td className="py-2">{row.note ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
