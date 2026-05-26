import { ReactNode } from "react";

// Passthrough — brand page needs no additional constraints beyond the dashboard shell.
export default function BrandLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
