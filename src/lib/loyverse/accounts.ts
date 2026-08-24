export type Account = {
  key: string;
  label: string;
  token: string;
};

export function getAccounts(): Account[] {
  const json = process.env.LOYVERSE_ACCOUNTS?.trim();
  if (json) {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        const accounts: Account[] = [];
        for (const raw of parsed) {
          if (
            raw &&
            typeof raw.key === "string" &&
            typeof raw.token === "string" &&
            raw.key.trim() &&
            raw.token.trim()
          ) {
            accounts.push({
              key: raw.key.trim(),
              label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : raw.key.trim(),
              token: raw.token.trim(),
            });
          }
        }
        if (accounts.length > 0) return accounts;
      }
    } catch {
      // invalid JSON — fall through to legacy
    }
  }

  const legacy = process.env.LOYVERSE_ACCESS_TOKEN?.trim();
  if (legacy) {
    return [{ key: "laguna", label: "Laguna (legacy)", token: legacy }];
  }

  return [];
}

export function getDefaultAccount(): Account | null {
  return getAccounts()[0] ?? null;
}

export function getAccountByKey(key: string): Account | null {
  return getAccounts().find((a) => a.key === key) ?? null;
}
