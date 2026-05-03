import { listBranches } from "@/lib/scheduling/data";

export default async function SchedulingOverviewPage() {
  const branches = await listBranches();

  return (
    <section className="rounded-lg border border-border bg-card p-5 text-card-foreground">
      <h1 className="text-xl font-semibold">Scheduling Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Entry point for weekly schedules and monthly payroll adjustments.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-border bg-background p-3">
          <p className="text-xs uppercase text-muted-foreground">Branches</p>
          <p className="text-2xl font-semibold">{branches.length}</p>
        </div>
        <div className="rounded-md border border-border bg-background p-3">
          <p className="text-xs uppercase text-muted-foreground">Week scope</p>
          <p className="text-2xl font-semibold">Mon-Sun</p>
        </div>
        <div className="rounded-md border border-border bg-background p-3">
          <p className="text-xs uppercase text-muted-foreground">Payroll mode</p>
          <p className="text-2xl font-semibold">Adjustments</p>
        </div>
      </div>
    </section>
  );
}
