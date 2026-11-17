import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Session } from "next-auth";

/** Page notes are limited to owner + admin (shared working notes between authors). */
export function canUsePageNotes(session: Session | null): boolean {
  const role = session?.user?.role;
  return role === "owner" || role === "admin";
}

/** Returns the session when the current user may read/write page notes, else null. */
export async function requireNotesUser(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canUsePageNotes(session)) return null;
  return session;
}
