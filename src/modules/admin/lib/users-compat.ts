export function isMissingAssignedPasswordColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const dbError = error as { code?: string; message?: string };
  return dbError.code === "42703"
    && dbError.message?.includes("assigned_password_encrypted") === true;
}
