"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimeOff } from "@/modules/scheduling/types";

interface Props {
  employees: Array<{ id: string; name: string }>;
}

export function TimeOffClient({ employees }: Props) {
  const [items, setItems] = useState<TimeOff[]>([]);
  const [empId, setEmpId] = useState(employees[0]?.id ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");

  async function load() {
    const r = await fetch("/api/scheduling/time-off");
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => {
    void load();
  }, []);

  async function add() {
    if (!empId || !from || !to) {
      toast.error("Employee + from + to required");
      return;
    }
    const r = await fetch("/api/scheduling/time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: empId, date_from: from, date_to: to, reason: reason || null }),
    });
    if (!r.ok) {
      toast.error((await r.json()).error ?? "Failed");
      return;
    }
    setFrom("");
    setTo("");
    setReason("");
    toast.success("Time off recorded — scheduling will warn on conflicts");
    void load();
  }

  async function remove(id: string) {
    const r = await fetch(`/api/scheduling/time-off?id=${id}`, { method: "DELETE" });
    if (!r.ok) toast.error("Delete failed");
    else void load();
  }

  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Record time off</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-sm">
            <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2" aria-label="Employee">
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2" aria-label="From" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2" aria-label="To" />
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className="h-9 rounded-md border border-border bg-background px-2" />
            <Button onClick={add}>Add</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming &amp; past ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="p-2">Employee</th>
                <th className="p-2">From</th>
                <th className="p-2">To</th>
                <th className="p-2">Reason</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="p-2 font-medium">{nameOf(t.employee_id)}</td>
                  <td className="p-2 font-mono">{t.date_from}</td>
                  <td className="p-2 font-mono">{t.date_to}</td>
                  <td className="p-2 text-muted-foreground">{t.reason ?? "—"}</td>
                  <td className="p-2 text-right">
                    <button className="text-xs underline hover:text-foreground" onClick={() => void remove(t.id)}>delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
