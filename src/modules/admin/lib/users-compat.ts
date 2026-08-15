export function isMissingAssignedPasswordColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const dbError = error as { code?: string; message?: string };
  const isColumnError =
    dbError.code === "42703" // raw Postgres: column does not exist
    || dbError.code === "PGRST205"; // PostgREST: column missing from schema cache
  return isColumnError
    && dbError.message?.includes("assigned_password_encrypted") === true;
}
