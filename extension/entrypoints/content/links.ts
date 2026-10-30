/**
 * Link helpers that run inside pages:
 * - short-link preview: hovering (or focusing) a bit.ly-style link shows where it leads and
 *   how that destination looks, before any click; the background reads the shortener's
 *   redirect without contacting the destination.
 * - link badges in Gmail, Outlook and WhatsApp Web: a status badge after every outside link,
 *   checked against the local lists first; only host names ever leave the browser.
 */

import type { Lang } from "@shared/content";
import { extractHost, hostParents, isShortLink, unwrapLink } from "@shared/hookguard";
import { ask } from "@/utils/messages";

import { LinkTooltip, makeBadge } from "./inline";

export const BADGE_SITES = new Set([
  "mail.google.com", "outlook.live.com", "outlook.office.com", "outlook.office365.com", "web.whatsapp.com",
]);
// The mail and chat services' own links are not badged.
const OWN = new Set([
  "google.com", "gmail.com", "googleusercontent.com", "gstatic.com", "youtube.com", "microsoft.com", "live.com",
  "office.com", "office365.com", "outlook.com", "microsoftonline.com", "whatsapp.com", "whatsapp.net",
]);
const HOVER_DELAY = 500;

function linkOf(target: EventTarget | null): HTMLAnchorElement | null {
  return target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
}

export function installShortLinkPreview(signal: AbortSignal, lang: Lang): void {
  const tooltip = new LinkTooltip(lang);
  const cache = new Map<string, Promise<Awaited<ReturnType<typeof ask<"expand">>>>>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let current: HTMLAnchorElement | null = null;

  const open = (anchor: HTMLAnchorElement) => {
    const href = unwrapLink(anchor.href);
    if (!isShortLink(extractHost(href))) return;
    current = anchor;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      tooltip.loading(anchor);
      if (!cache.has(href)) cache.set(href, ask("expand", { url: href }));
      const { destination, verdict } = await cache.get(href)!;
      if (current === anchor) tooltip.result(anchor, destination, verdict?.level ?? null);
    }, HOVER_DELAY);
  };
  const close = () => {
    clearTimeout(timer);
    current = null;
    tooltip.hide();
  };

  const opts = { signal, passive: true };
  document.addEventListener("mouseover", (e) => (linkOf(e.target) ? open(linkOf(e.target)!) : undefined), opts);
  document.addEventListener("focusin", (e) => (linkOf(e.target) ? open(linkOf(e.target)!) : undefined), opts);
  document.addEventListener("mouseout", (e) => (linkOf(e.target) === current ? close() : undefined), opts);
  document.addEventListener("focusout", close, opts);
  addEventListener("scroll", close, opts);
}

export function installLinkBadges(signal: AbortSignal, lang: Lang): void {
  const own = location.hostname;
  let scheduled: ReturnType<typeof setTimeout> | undefined;

  async function scan() {
    const pending = new Map<string, HTMLAnchorElement[]>();
    for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href^="http"]:not([data-hookguard-seen])')) {
      a.dataset.hookguardSeen = "";
      const host = extractHost(unwrapLink(a.href));
      if (!host || host === own || hostParents(host).some((p) => OWN.has(p))) continue;
      pending.set(host, [...(pending.get(host) ?? []), a]);
    }
    if (!pending.size) return;
    const levels = await ask("badges", { hosts: [...pending.keys()] });
    for (const [host, anchors] of pending) {
      const level = levels[host];
      if (!level) continue;
      for (const a of anchors) if (a.isConnected) a.after(makeBadge(level, host, lang));
    }
  }

  const observer = new MutationObserver(() => {
    clearTimeout(scheduled);
    scheduled = setTimeout(() => void scan(), 800);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  signal.addEventListener("abort", () => observer.disconnect());
  void scan();
}
