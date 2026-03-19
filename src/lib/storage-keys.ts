/** Per-Google-account localStorage keys so sessions don’t leak across logins */

export function selectedLocationsStorageKey(email: string | null | undefined): string {
  const e = email?.trim().toLowerCase();
  return e ? `capybara-selected-locations:${e}` : "capybara-selected-locations";
}

export function dashboardStateStorageKey(email: string | null | undefined): string {
  const e = email?.trim().toLowerCase();
  return e ? `capybara-dashboard-state:${e}` : "capybara-dashboard-state";
}
