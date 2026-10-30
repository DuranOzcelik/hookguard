/**
 * In-page elements that are created per link (badges) or follow the pointer (the short-link
 * tooltip): plain DOM in a shadow root each, with the shared tokens, so no React per link.
 * Icons are Solar SVGs compiled into the bundle; anything from a page goes in as text only.
 */

import tokensCss from "@shared/design/tokens.css?inline";
import { CONTENT, STATUS_TONE, type Lang } from "@shared/content";
import type { Level } from "@shared/hookguard";
import cautionSvg from "~icons/solar/danger-triangle-bold?raw";
import linkSvg from "~icons/solar/link-round-angle-bold?raw";
import safeSvg from "~icons/solar/shield-check-bold?raw";
import dangerSvg from "~icons/solar/shield-warning-bold?raw";

import inlineCss from "./inline.css?inline";

const STYLE = tokensCss + inlineCss;
const ICON: Record<Level, string> = { low: safeSvg, medium: cautionSvg, high: dangerSvg };
const SHORT: Record<Lang, Record<Level, string>> = {
  en: { low: "", medium: "Careful", high: "Danger" },
  tr: { low: "", medium: "Dikkat", high: "Tehlikeli" },
};
const TIP = {
  en: {
    loading: "Opening the short link…",
    title: "Short link",
    goesTo: "This short link goes to:",
    unknown: "We could not find where it leads. Ask the person who sent it before you click.",
  },
  tr: {
    loading: "Kısa link açılıyor…",
    title: "Kısa link",
    goesTo: "Bu kısa link şuraya gidiyor:",
    unknown: "Nereye gittiği bulunamadı. Tıklamadan önce linki gönderen kişiye sor.",
  },
};

function shadowHost(tag: "span" | "div"): { host: HTMLElement; root: ShadowRoot } {
  const host = document.createElement(tag);
  host.dataset.hookguard = "";
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = STYLE;
  root.append(style);
  return { host, root };
}

function iconSpan(svg: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.innerHTML = svg; // a static icon from the bundle, never page content
  span.style.display = "contents";
  return span;
}

/** A small status badge for the link it follows: icon only when it looks safe, icon and word otherwise. */
export function makeBadge(level: Level, host: string, lang: Lang): HTMLElement {
  const { host: el, root } = shadowHost("span");
  const label = `HookGuard: ${CONTENT[lang].status[level].title} (${host})`;
  el.title = label;
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", label);
  const badge = document.createElement("span");
  badge.className = `badge tone-${STATUS_TONE[level]}`;
  badge.append(iconSpan(ICON[level]));
  if (SHORT[lang][level]) badge.append(SHORT[lang][level]);
  root.append(badge);
  return el;
}

export class LinkTooltip {
  private readonly host: HTMLElement;
  private readonly box: HTMLDivElement;

  constructor(private readonly lang: Lang) {
    const { host, root } = shadowHost("div");
    this.host = host;
    this.box = document.createElement("div");
    this.box.className = "tooltip";
    this.box.setAttribute("role", "status");
    root.append(this.box);
  }

  private place(anchor: Element) {
    const rect = anchor.getBoundingClientRect();
    const below = rect.bottom + 8;
    this.box.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - 368))}px`;
    this.box.style.top = below + 180 < innerHeight ? `${below}px` : `${Math.max(8, rect.top - 188)}px`;
    if (!this.host.isConnected) document.documentElement.append(this.host);
  }

  private head(text: string) {
    const head = document.createElement("div");
    head.className = "tooltip__head";
    head.append(iconSpan(linkSvg), text);
    return head;
  }

  loading(anchor: Element) {
    this.box.replaceChildren(this.head(TIP[this.lang].loading));
    this.place(anchor);
  }

  result(anchor: Element, destination: string | null, level: Level | null) {
    if (!destination) {
      const muted = document.createElement("p");
      muted.className = "tooltip__muted";
      muted.textContent = TIP[this.lang].unknown;
      this.box.replaceChildren(this.head(TIP[this.lang].title), muted);
    } else {
      const dest = document.createElement("div");
      dest.className = "tooltip__dest";
      dest.textContent = destination;
      const parts: Node[] = [this.head(TIP[this.lang].goesTo), dest];
      if (level) {
        const status = document.createElement("span");
        status.className = `tooltip__status tone-${STATUS_TONE[level]}`;
        status.append(iconSpan(ICON[level]), CONTENT[this.lang].status[level].title);
        parts.push(status);
      }
      this.box.replaceChildren(...parts);
    }
    this.place(anchor);
  }

  hide() {
    this.host.remove();
  }
}
