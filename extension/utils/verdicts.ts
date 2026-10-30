/**
 * Verdicts: what the extension decided about a host, from the local lists, the API or
 * what the page itself showed. Kept in storage.session (cleared when the browser
 * closes) for an hour, with the hosts the user chose to open despite a warning, and
 * stored in storage.local: the sites the user trusts for form entry.
 */

import { browser } from "wxt/browser";

import { CONTENT, displayLevel, type Lang } from "@shared/content";
import type { Category, CheckResult, Level, Reason } from "@shared/hookguard";

export interface Verdict {
  host: string;
  level: Level;
  score: number;
  source: "blocklist" | "allowlist" | "api";
  reasons: Reason[];
  category: Category | null;
  ageDays: number | null;
  checkedAt: number;
  details?: CheckResult["details"];
  checked_utc?: string;
}

const TTL = 60 * 60 * 1000;
const MAX_CACHED = 500;

export function fromResult(result: CheckResult): Verdict {
  const registered = result.details.registration?.registered_utc;
  return {
    host: result.domain,
    level: result.level,
    score: result.score,
    source: "api",
    reasons: result.reasons,
    category: result.category,
    ageDays: registered ? Math.floor((Date.now() - Date.parse(registered)) / 86_400_000) : null,
    checkedAt: Date.now(),
    details: result.details,
    checked_utc: result.checked_utc,
  };
}

export function fromBlocklist(host: string, listed: string, lang: Lang): Verdict {
  const t = CONTENT[lang].local;
  return {
    host,
    level: "high",
    score: listed === host ? 95 : 90,
    source: "blocklist",
    reasons: [{ code: "usom_local", points: 0, severity: "danger", text: listed === host ? t.listed : t.parentListed(listed) }],
    category: null,
    ageDays: null,
    checkedAt: Date.now(),
  };
}

export function fromAllowlist(host: string, lang: Lang): Verdict {
  return {
    host,
    level: "low",
    score: 0,
    source: "allowlist",
    reasons: [{ code: "allowlist", points: 0, severity: "safe", text: CONTENT[lang].local.allowlisted }],
    category: null,
    ageDays: null,
    checkedAt: Date.now(),
  };
}

/** The level people see: a category can raise it (unless category protection is off), never lower it. */
export function effectiveLevel(verdict: Verdict, categoryProtection = true): Level {
  if (!categoryProtection && verdict.category?.id !== "tech_support") return verdict.level;
  return displayLevel(verdict.level, verdict.category);
}

async function sessionGet<T>(key: string, fallback: T): Promise<T> {
  return ((await browser.storage.session.get(key))[key] as T) ?? fallback;
}

export async function cachedVerdict(host: string): Promise<Verdict | null> {
  const verdict = (await sessionGet<Record<string, Verdict>>("verdicts", {}))[host];
  return verdict && Date.now() - verdict.checkedAt < TTL ? verdict : null;
}

export async function rememberVerdict(verdict: Verdict): Promise<void> {
  const verdicts = await sessionGet<Record<string, Verdict>>("verdicts", {});
  verdicts[verdict.host] = verdict;
  const hosts = Object.keys(verdicts);
  for (const host of hosts.slice(0, Math.max(0, hosts.length - MAX_CACHED))) delete verdicts[host];
  await browser.storage.session.set({ verdicts });
}

async function sessionList(key: string): Promise<string[]> {
  return sessionGet<string[]>(key, []);
}

export async function isAllowedForSession(host: string): Promise<boolean> {
  return (await sessionList("allowed")).includes(host);
}

export async function allowForSession(host: string): Promise<void> {
  const allowed = await sessionList("allowed");
  if (!allowed.includes(host)) await browser.storage.session.set({ allowed: [...allowed, host] });
}

export async function isTrusted(host: string): Promise<boolean> {
  const { trusted } = await browser.storage.local.get("trusted");
  return ((trusted as string[]) ?? []).includes(host);
}

export async function trust(host: string): Promise<void> {
  const { trusted } = await browser.storage.local.get("trusted");
  const list = (trusted as string[]) ?? [];
  if (!list.includes(host)) await browser.storage.local.set({ trusted: [...list, host] });
}
