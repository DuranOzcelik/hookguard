/**
 * HookGuard background
 *
 * Navigation: every top-level navigation, and every redirect it goes through, is checked
 * locally first. A name on the known-threat hash list is stopped before the page loads; a
 * name on the allowlist passes without asking anyone. Other hosts go to the API as a bare
 * name (never the path or query). A first check of a new domain can take a second or two,
 * so a page the API rates high may start loading before the warning replaces it.
 *
 * Also here: family mode (PIN-locked categories), the download check (risky files such as
 * .apk are paused until the user decides), short-link expansion without contacting the
 * destination, the decisions behind form protection and page signals, and the weekly summary.
 */

import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

import { CONTENT } from "@shared/content";
import { SHORTENERS, checkDomain, extractHost, isIp, isShortLink, reportSite, type Level } from "@shared/hookguard";
import { listStatus, matchList, refreshLists } from "@/utils/lists";
import type { Api, PageSignal, Request, ShowVerdict, Status } from "@/utils/messages";
import { cleanApiBase, getSettings, hashPin, newSalt, pinMatches, writeSettings } from "@/utils/settings";
import { closeWeek, count, getStats } from "@/utils/stats";
import {
  allowForSession,
  cachedVerdict,
  effectiveLevel,
  fromAllowlist,
  fromBlocklist,
  fromResult,
  isAllowedForSession,
  isTrusted,
  rememberVerdict,
  trust,
  type Verdict,
} from "@/utils/verdicts";

const LIST_REFRESH_MINUTES = 360;
const RISKY_FILES = [".apk", ".exe", ".msi", ".scr", ".bat", ".cmd", ".vbs", ".js", ".jar", ".ps1", ".hta"];
const BADGE: Record<Level, { text: string; color: string }> = {
  high: { text: "!", color: "#b91c1c" },
  medium: { text: "!", color: "#c2410c" },
  low: { text: "", color: "#15803d" },
};
const CATEGORY_RANK = { high: 2, medium: 1 };

const inflight = new Map<string, Promise<Verdict | null>>();
const navigatingTo = new Map<number, string>(); // tab -> host of its latest top-level navigation
const counted = new Set<string>();
const handledDownloads = new Set<number>();
let apiError: string | null = null;

const PRIVATE_IP = /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)|^(::1|f[cd][0-9a-f]{2}:|fe80:)/i;

/** The host to check, or null for browser pages, local addresses and the API itself. */
function checkableHost(url: string, apiBase: string): string | null {
  if (!/^https?:/i.test(url)) return null;
  const host = extractHost(url);
  if (!host || host.endsWith(".local") || host.endsWith(".localhost")) return null;
  if (isIp(host) && PRIVATE_IP.test(host)) return null;
  if (host === extractHost(apiBase)) return null;
  return host;
}

const warningUrl = (params: Record<string, string>) =>
  `${browser.runtime.getURL("/warning.html")}?${new URLSearchParams(params)}`;

async function askApi(host: string): Promise<Verdict | null> {
  try {
    const settings = await getSettings();
    const verdict = fromResult(await checkDomain(settings.apiBase, host, { lang: settings.lang }));
    await rememberVerdict(verdict);
    apiError = null;
    return verdict;
  } catch (err) {
    apiError = err instanceof Error ? err.message : String(err);
    return null; // fail open: an unreachable API must not break browsing
  }
}

/** Local lists first, then the session cache, then the API (one request per host at a time). */
async function verdictFor(host: string, fresh = false): Promise<Verdict | null> {
  if (!fresh) {
    const { lang } = await getSettings();
    const listed = await matchList("blocklist", host);
    if (listed) return fromBlocklist(host, listed, lang);
    if (await matchList("allowlist", host)) return fromAllowlist(host, lang);
    const cached = await cachedVerdict(host);
    if (cached) return cached;
  }
  let pending = inflight.get(host);
  if (!pending) {
    pending = askApi(host).finally(() => inflight.delete(host));
    inflight.set(host, pending);
  }
  return pending;
}

async function setBadge(tabId: number, level: Level): Promise<void> {
  const { text, color } = BADGE[level];
  try {
    await browser.action.setBadgeText({ tabId, text });
    await browser.action.setBadgeBackgroundColor({ tabId, color });
  } catch {
    // the tab was closed
  }
}

async function countOnce(kind: "warned" | "blocked", host: string): Promise<void> {
  if (counted.has(`${kind}:${host}`)) return;
  counted.add(`${kind}:${host}`);
  await count(kind);
}

/** Family lock, then the warning page for high risk, then the banner for medium risk. */
async function decide(tabId: number, url: string, host: string, verdict: Verdict): Promise<void> {
  const settings = await getSettings();
  const level = effectiveLevel(verdict, settings.categoryProtection);
  await setBadge(tabId, level);
  const category = verdict.category?.id;
  const allowed = await isAllowedForSession(host);
  const locked = settings.family.enabled && category && (settings.family.blocked as string[]).includes(category);
  if (locked && !allowed) {
    await browser.tabs.update(tabId, { url: warningUrl({ kind: "family", host, url }) });
    await countOnce("blocked", host);
  } else if (level === "high" && !allowed) {
    const kind = category === "gambling" ? "gambling" : category === "tech_support" ? "tech_support" : "danger";
    await browser.tabs.update(tabId, { url: warningUrl({ kind, host, url }) });
    await countOnce("blocked", host);
  } else if (level === "medium") {
    const message: ShowVerdict = { type: "show", verdict };
    browser.tabs.sendMessage(tabId, message).catch(() => {}); // the content script also asks when it loads
    await countOnce("warned", host);
  }
}

async function guard(tabId: number, url: string): Promise<void> {
  const host = checkableHost(url, (await getSettings()).apiBase);
  if (!host) return;
  navigatingTo.set(tabId, host);
  if (!counted.has(host)) {
    counted.add(host);
    await count("checked");
  }
  const verdict = await verdictFor(host);
  if (!verdict || navigatingTo.get(tabId) !== host) return; // the tab has moved on
  await decide(tabId, url, host, verdict);
}

/**
 * Where a short link leads, read from the shortener's redirect; the destination itself is never
 * requested. A listener registered once at start-up records each shortener's Location header
 * (registering it per request could miss the response), and the fetch below uses
 * redirect: "error", so it stops at the first redirect.
 */
const redirects = new Map<string, string>();

function recordRedirect(d: { url: string; responseHeaders?: { name: string; value?: string }[] }): undefined {
  const location = d.responseHeaders?.find((h) => h.name.toLowerCase() === "location")?.value;
  if (location) redirects.set(d.url, location);
  return undefined;
}

async function firstRedirect(url: string): Promise<string | null> {
  const key = new URL(url).href;
  redirects.delete(key);
  await fetch(key, { redirect: "error", credentials: "omit", cache: "no-store" }).catch(() => {});
  for (let i = 0; i < 20 && !redirects.has(key); i++) await new Promise((r) => setTimeout(r, 50));
  const location = redirects.get(key) ?? null;
  redirects.delete(key);
  return location;
}

async function expandShortLink(url: string): Promise<string | null> {
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    const host = extractHost(current);
    if (!host) return null;
    if (!isShortLink(host)) return host;
    const location = await firstRedirect(current);
    if (!location) return null;
    current = new URL(location, current).href;
  }
  return null;
}

async function inspectDownload(id: number, url: string, referrer: string | undefined, filename: string): Promise<void> {
  if (handledDownloads.has(id)) return;
  const settings = await getSettings();
  if (!settings.downloadWarning) return;
  let name = filename;
  if (!name) {
    try {
      name = new URL(url).pathname;
    } catch {
      return;
    }
  }
  name = name.toLowerCase();
  const ext = RISKY_FILES.find((e) => name.endsWith(e));
  if (!ext) return;
  handledDownloads.add(id);
  const host = extractHost(referrer ?? "") ?? extractHost(url); // the page that offered the file
  const verdict = host ? await verdictFor(host) : null;
  const allowlisted = verdict?.source === "allowlist";
  const level = verdict ? effectiveLevel(verdict, settings.categoryProtection) : "medium";
  const young = verdict?.ageDays == null || verdict.ageDays < 180;
  // Banks and couriers never send apps as files: an .apk from anywhere but a well-known site is suspect.
  const risky = ext === ".apk" ? !allowlisted : level !== "low" || (!allowlisted && young);
  if (!risky) return;
  await browser.downloads.pause(id).catch(() => {});
  await count("downloads");
  const file = name.split(/[\\/]/).pop() ?? name;
  await browser.tabs.create({ url: warningUrl({ kind: "download", id: String(id), file, host: host ?? "" }) });
}

async function status(): Promise<Status> {
  const settings = await getSettings();
  const { pinHash, salt: _salt, ...family } = settings.family;
  return {
    apiBase: settings.apiBase,
    apiError,
    lists: await listStatus(),
    stats: await getStats(),
    settings: { ...settings, family: { ...family, hasPin: Boolean(pinHash) } },
  };
}

async function pageSignal(tabId: number | undefined, url: string, host: string, signal: PageSignal) {
  const verdict = await verdictFor(host);
  if (!verdict || verdict.source !== "api") return { verdict };
  const current = verdict.category;
  if (!current || CATEGORY_RANK[signal.confidence] > CATEGORY_RANK[current.confidence] || signal.id === "tech_support") {
    verdict.category = { ...signal, label: CONTENT[(await getSettings()).lang].categoryNotice[signal.id].title };
    await rememberVerdict(verdict);
  }
  if (tabId !== undefined) await decide(tabId, url, host, verdict);
  return { verdict };
}

type Sender = { id?: string; tab?: { id?: number; url?: string } };

async function handle(request: Request, sender: Sender): Promise<Api[keyof Api][1]> {
  const tabId = sender.tab?.id;
  switch (request.type) {
    case "verdict":
      return verdictFor(request.host, request.fresh);
    case "proceed":
      await allowForSession(request.host);
      return null;
    case "status":
      return status();
    case "refresh-lists":
      await refreshLists();
      return status();
    case "save-settings": {
      const settings = await getSettings();
      if (settings.family.enabled && !(await pinMatches(settings, request.pin))) return { ok: false, status: await status() };
      const next = { ...settings, ...request.patch, family: { ...settings.family, ...request.patch.family } };
      if (request.patch.apiBase !== undefined) next.apiBase = cleanApiBase(request.patch.apiBase);
      // Cached reasons are in the old language; check again in the new one.
      if (next.lang !== settings.lang) await browser.storage.session.remove("verdicts");
      if (request.newPin) {
        next.family.salt = newSalt();
        next.family.pinHash = await hashPin(request.newPin, next.family.salt);
      }
      if (!next.family.pinHash) next.family.enabled = false; // family mode needs a PIN
      await writeSettings(next);
      if (next.apiBase !== settings.apiBase) await refreshLists();
      return { ok: true, status: await status() };
    }
    case "report":
      try {
        await reportSite((await getSettings()).apiBase, { ...request, source: "extension" });
        return { ok: true };
      } catch {
        return { ok: false };
      }
    case "expand": {
      if (!(await getSettings()).shortLinkPreview) return { destination: null, verdict: null };
      const destination = await expandShortLink(request.url);
      return { destination, verdict: destination ? await verdictFor(destination) : null };
    }
    case "badges": {
      const levels: Record<string, Level | null> = {};
      const settings = await getSettings();
      await Promise.all(
        request.hosts.slice(0, 40).map(async (host) => {
          const verdict = await verdictFor(host);
          levels[host] = verdict ? effectiveLevel(verdict, settings.categoryProtection) : null;
        }),
      );
      return levels;
    }
    case "form-check": {
      const settings = await getSettings();
      if (!settings.formProtection || (await isTrusted(request.host))) return { warn: false, verdict: null };
      const verdict = await verdictFor(request.host);
      if (!verdict || verdict.source === "allowlist" || verdict.details?.official_brand || verdict.details?.tranco_rank)
        return { warn: false, verdict };
      // Warn on risky sites, and on sites too new (or too unknown) to have earned trust.
      const warn =
        effectiveLevel(verdict, settings.categoryProtection) !== "low" || verdict.ageDays === null || verdict.ageDays < 180;
      if (warn) await count("forms");
      return { warn, verdict };
    }
    case "trust-site":
      await trust(request.host);
      return null;
    case "page-signal":
      return pageSignal(tabId, sender.tab?.url ?? "", request.host, request.signal);
    case "leave":
      if (tabId !== undefined) await browser.tabs.goBack(tabId).catch(() => browser.tabs.remove(tabId));
      return null;
    case "family-unlock": {
      const ok = await pinMatches(await getSettings(), request.pin);
      if (ok) await allowForSession(request.host);
      return { ok };
    }
    case "download-action": {
      const actions = {
        cancel: () => browser.downloads.cancel(request.id),
        resume: () => browser.downloads.resume(request.id),
        remove: () => browser.downloads.removeFile(request.id),
      };
      try {
        await actions[request.action]();
        return { ok: true };
      } catch {
        return { ok: false };
      }
    }
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => void refreshLists());
  browser.runtime.onStartup.addListener(() => void refreshLists());
  browser.alarms.create("refresh-lists", { periodInMinutes: LIST_REFRESH_MINUTES });
  browser.alarms.create("weekly", { periodInMinutes: 24 * 60 });
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "refresh-lists") void refreshLists();
    if (alarm.name === "weekly") {
      const week = await closeWeek();
      const settings = await getSettings();
      if (week && settings.weeklySummary) {
        await browser.notifications.create("weekly", {
          type: "basic",
          iconUrl: browser.runtime.getURL("/icon/128.png"),
          title: settings.lang === "tr" ? "HookGuard haftalık özet" : "HookGuard weekly summary",
          message: CONTENT[settings.lang].weekly(week),
        });
      }
    }
  });

  browser.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId === 0) void guard(details.tabId, details.url);
  });
  browser.webRequest.onHeadersReceived.addListener(
    recordRedirect,
    { urls: [...SHORTENERS].flatMap((h) => [`http://${h}/*`, `https://${h}/*`]) },
    ["responseHeaders"],
  );
  // Server redirects (short links, tracking hops) never fire onBeforeNavigate again; check each hop.
  browser.webRequest.onBeforeRedirect.addListener(
    (details) => {
      if (details.tabId >= 0) void guard(details.tabId, details.redirectUrl);
    },
    { urls: ["http://*/*", "https://*/*"], types: ["main_frame"] },
  );
  // A committed navigation clears the tab's badge; put the verdict back.
  browser.webNavigation.onCommitted.addListener(async (details) => {
    if (details.frameId !== 0) return;
    const settings = await getSettings();
    const host = checkableHost(details.url, settings.apiBase);
    const verdict = host ? await cachedVerdict(host) : null;
    if (verdict) await setBadge(details.tabId, effectiveLevel(verdict, settings.categoryProtection));
  });
  browser.tabs.onRemoved.addListener((tabId) => navigatingTo.delete(tabId));

  browser.downloads.onCreated.addListener((item) => {
    void inspectDownload(item.id, item.finalUrl || item.url, item.referrer, item.filename);
  });
  browser.downloads.onChanged.addListener(async (delta) => {
    if (!delta.filename?.current) return;
    const [item] = await browser.downloads.search({ id: delta.id });
    if (item) void inspectDownload(item.id, item.finalUrl || item.url, item.referrer, item.filename);
  });

  browser.runtime.onMessage.addListener((request: Request, sender: Sender, sendResponse: (r: unknown) => void) => {
    if (sender.id !== browser.runtime.id) return false;
    handle(request, sender).then(sendResponse, (err) => {
      console.error("HookGuard:", err);
      sendResponse(null);
    });
    return true; // answer asynchronously
  });
});
