/**
 * HookGuard client helpers, shared by the web app and the browser extension.
 *
 * They must agree with the API (backend/domains.py): only the host name ever goes to
 * an API, and list hashes are the first 16 hex characters of SHA-256 over the
 * lowercase punycode host, checked for the host and each of its parents. The one
 * exception is expandLink, which the web page calls only when the user asks where a
 * short link leads.
 */

export type Level = "low" | "medium" | "high";
export type Severity = "danger" | "warning" | "safe" | "info";
export type CategoryId = "gambling" | "investment" | "shopping" | "adult" | "tech_support";
export type ReportCategory =
  | "phishing"
  | "gambling"
  | "investment"
  | "shopping"
  | "tech_support"
  | "adult"
  | "false_positive"
  | "other";

export interface Reason {
  code: string;
  points: number;
  severity: Severity;
  text: string;
}

export interface Category {
  id: CategoryId;
  label: string;
  confidence: "high" | "medium";
  reasons: string[];
}

export interface CheckResult {
  domain: string;
  score: number;
  level: Level;
  reasons: Reason[];
  category: Category | null;
  checked_utc: string;
  details: {
    registered_domain: string;
    model_score: number | null;
    model_threshold: number | null;
    usom: { entry: string; listed_utc: string; category: string; usom_id: string } | null;
    official_brand: string | null;
    shared_host: string | null;
    tranco_rank: number | null;
    dns: { status: string; addresses: string[] } | null;
    registration: { registered_utc: string | null; source: string | null } | null;
  };
}

export interface HashList {
  version: string;
  algorithm: "sha256";
  hex_chars: number;
  count: number;
  hashes: string[];
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

export function isIp(host: string): boolean {
  return IPV4.test(host) || host.includes(":");
}

/**
 * "https://user@Giris.Akbank.com.tr:8443/x?y=1" -> "giris.akbank.com.tr"; null if it is not a web address.
 * Defanged links from security reports ("hxxps://evil[.]com") are accepted too.
 */
export function extractHost(input: string): string | null {
  const text = input.trim().replace(/^hxxp/i, "http").replace(/\[\.\]/g, ".");
  if (!text || /\s/.test(text)) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `http://${text}`);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  let host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("[")) host = host.slice(1, -1);
  if (!host.includes(".") && !host.includes(":")) return null;
  return host;
}

/** The host and every parent with at least two labels: "a.b.com" -> ["a.b.com", "b.com"]. */
export function hostParents(host: string): string[] {
  if (isIp(host)) return [host];
  const labels = host.split(".");
  return labels.slice(0, -1).map((_, i) => labels.slice(i).join("."));
}

export async function hostHash(host: string, hexChars = 16): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(host));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, hexChars);
}

/** The first of the host and its parents whose hash is in the set, or null. */
export async function matchHashes(host: string, hashes: Set<string>, hexChars = 16): Promise<string | null> {
  for (const name of hostParents(host)) {
    if (hashes.has(await hostHash(name, hexChars))) return name;
  }
  return null;
}

/** Link shorteners; must match SHORTENERS in backend/shortlinks.py. */
export const SHORTENERS = new Set([
  "bit.ly", "bitly.com", "tinyurl.com", "t.co", "cutt.ly", "is.gd", "v.gd", "ow.ly", "rebrand.ly", "shorturl.at",
  "rb.gy", "t.ly", "s.id", "tiny.cc", "bl.ink", "buff.ly", "lnkd.in", "goo.su", "clck.ru", "qrco.de", "u.to", "short.gy",
]);

export function isShortLink(host: string | null): boolean {
  return host !== null && SHORTENERS.has(host);
}

/**
 * Mail and chat apps wrap outgoing links in their own redirect; the real target is in
 * the query: google.com/url?q=, *.safelinks.protection.outlook.com/?url=, l.facebook.com/l.php?u=.
 */
export function unwrapLink(href: string): string {
  try {
    const url = new URL(href);
    const host = url.hostname;
    const inner =
      (host.endsWith("google.com") && url.pathname === "/url" && (url.searchParams.get("q") ?? url.searchParams.get("url"))) ||
      (host.endsWith("safelinks.protection.outlook.com") && url.searchParams.get("url")) ||
      ((host === "l.facebook.com" || host === "l.instagram.com") && url.searchParams.get("u"));
    return inner && /^https?:/i.test(inner) ? inner : href;
  } catch {
    return href;
  }
}

/** Card numbers pass the Luhn check; 13 to 19 digits. */
export function luhnValid(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Turkish identity numbers: 11 digits, no leading zero, two check digits. */
export function tcknValid(digits: string): boolean {
  if (!/^[1-9]\d{10}$/.test(digits)) return false;
  const d = (i: number) => Number(digits[i]);
  const odd = d(0) + d(2) + d(4) + d(6) + d(8);
  const even = d(1) + d(3) + d(5) + d(7);
  const tenth = (((odd * 7 - even) % 10) + 10) % 10;
  const eleventh = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((sum, i) => sum + d(i), 0) % 10;
  return d(9) === tenth && d(10) === eleventh;
}

async function post<T>(apiBase: string, path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(response.status, typeof data.detail === "string" ? data.detail : response.statusText);
  }
  return response.json();
}

export function checkDomain(
  apiBase: string,
  host: string,
  options: { lang?: "tr" | "en"; signal?: AbortSignal } = {},
): Promise<CheckResult> {
  return post(apiBase, "/api/check", { domain: host, lang: options.lang ?? "tr" }, options.signal);
}

/** Where a short link leads (host only). Sends the whole short link, so call it only when the user asks. */
export function expandLink(
  apiBase: string,
  url: string,
  signal?: AbortSignal,
): Promise<{ short_host: string; destination: string | null; hops: number }> {
  return post(apiBase, "/api/expand", { url }, signal);
}

export function reportSite(
  apiBase: string,
  report: { domain: string; category: ReportCategory; note?: string; source: "web" | "extension" },
): Promise<{ status: string; domain: string }> {
  return post(apiBase, "/api/report", report);
}

export const REPO_URL = "https://github.com/DuranOzcelik/hookguard";

/** A pre-filled GitHub issue for a report (.github/ISSUE_TEMPLATE/report.yml), when there is no API to send it to. */
export function reportOnGitHub(domain: string, category: ReportCategory, note: string): string {
  const query = new URLSearchParams({ template: "report.yml", title: `Report: ${domain}`, domain, category, note });
  return `${REPO_URL}/issues/new?${query}`;
}

export interface Shortened {
  code: string | null; // null: the destination looked dangerous and was not shortened
  path: string | null;
  destination: string;
  result: CheckResult;
}

/** Shortens a link after checking where it leads. Sends the whole link: the user asked for it. */
export function shortenLink(apiBase: string, url: string, lang: "tr" | "en"): Promise<Shortened> {
  return post(apiBase, "/api/shorten", { url, lang });
}

/** Where a HookGuard short link leads, checked again now. */
export async function openShortLink(
  apiBase: string,
  code: string,
  lang: "tr" | "en",
): Promise<{ code: string; url: string; destination: string; created_utc: string; result: CheckResult }> {
  const response = await fetch(`${apiBase}/api/short/${encodeURIComponent(code)}?lang=${lang}`);
  if (!response.ok) throw new ApiError(response.status, response.statusText);
  return response.json();
}
