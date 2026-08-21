const DEFAULT_BASE = "https://api.loyverse.com/v1.0";

export class LoyverseApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "LoyverseApiError";
  }
}

function getConfig() {
  const token = process.env.LOYVERSE_ACCESS_TOKEN?.trim();
  const base = (process.env.LOYVERSE_API_BASE ?? DEFAULT_BASE).replace(/\/$/, "");
  return { token, base };
}

export function isLoyverseConfigured(): boolean {
  return Boolean(getConfig().token);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loyverseFetch<T = unknown>(
  path: string,
  params?: Record<string, string | number | undefined>,
  options?: { maxRetries?: number },
): Promise<T> {
  const { token, base } = getConfig();
  if (!token) {
    throw new LoyverseApiError("LOYVERSE_ACCESS_TOKEN is not configured", 503);
  }

  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const maxRetries = options?.maxRetries ?? 3;
  let attempt = 0;

  while (true) {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (res.status === 429 && attempt < maxRetries) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? "2");
      await sleep(Math.max(retryAfter, 1) * 1000 * (attempt + 1));
      attempt++;
      continue;
    }

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!res.ok) {
      const message =
        typeof body === "object" && body && "message" in body
          ? String((body as { message: string }).message)
          : `Loyverse API error (${res.status})`;
      throw new LoyverseApiError(message, res.status, body);
    }

    return body as T;
  }
}

export interface LoyversePage<T> {
  cursor?: string | null;
  [key: string]: T[] | string | null | undefined;
}

export async function loyverseFetchAll<TItem>(
  path: string,
  listKey: string,
  params?: Record<string, string | number | undefined>,
  options?: { pageLimit?: number; maxPages?: number },
): Promise<TItem[]> {
  const pageLimit = options?.pageLimit ?? 250;
  const maxPages = options?.maxPages ?? 50;
  const items: TItem[] = [];
  let cursor: string | undefined;
  let pages = 0;

  while (pages < maxPages) {
    const page = await loyverseFetch<LoyversePage<TItem>>(path, {
      ...params,
      limit: pageLimit,
      cursor,
    });

    const chunk = page[listKey];
    if (Array.isArray(chunk)) {
      items.push(...chunk);
    }

    cursor = typeof page.cursor === "string" ? page.cursor : undefined;
    pages++;
    if (!cursor) break;
  }

  return items;
}
