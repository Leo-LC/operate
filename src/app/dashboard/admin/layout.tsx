import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/dashboard");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 border-b border-border pb-4">
        <nav className="flex gap-1">
          {[
            { href: "/dashboard/admin/users", label: "Users" },
            { href: "/dashboard/admin/employees", label: "Employees" },
            { href: "/dashboard/admin/locations", label: "Locations" },
            { href: "/dashboard/admin/audit-logs", label: "Audit Logs" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
