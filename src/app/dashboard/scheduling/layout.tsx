"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard/scheduling", label: "Overview", exact: true },
  { href: "/dashboard/scheduling/schedules", label: "Schedules" },
  { href: "/dashboard/scheduling/employees", label: "Employees" },
  { href: "/dashboard/scheduling/adjustments", label: "Adjustments" },
  { href: "/dashboard/scheduling/payroll", label: "Payroll" },
];

export default function SchedulingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 border-b border-border pb-4">
        <span className="mr-3 text-sm font-medium text-muted-foreground">Scheduling</span>
        <nav className="flex gap-1 flex-wrap">
          {NAV.map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
