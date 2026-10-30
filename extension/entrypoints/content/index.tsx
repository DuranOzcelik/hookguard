/**
 * HookGuard in the page. Everything it shows lives in a Shadow DOM so the page can neither
 * restyle nor hide it, and nothing it reads leaves the browser: the background gets only
 * host names and plain-word conclusions.
 *
 * - Banner: orange for medium risk, red for a high-risk page opened anyway.
 * - Form protection: the moment a password, a card number (Luhn-valid) or a Turkish
 *   identity number (valid check digits) starts going into a risky or unknown site.
 *   The value is examined here and never stored or sent.
 * - Page signals: illegal betting and fake investment phrases, shops without ETBİS,
 *   fake "virus found" screens.
 * - Short-link preview and, in Gmail, Outlook and WhatsApp Web, link badges.
 */

import { createRoot, type Root } from "react-dom/client";
import { browser } from "wxt/browser";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createShadowRootUi, type ShadowRootContentScriptUi } from "wxt/utils/content-script-ui/shadow-root";
import { defineContentScript } from "wxt/utils/define-content-script";

import "@shared/design/tokens.css";
import "@shared/design/components.css";
import { extractHost, luhnValid, tcknValid } from "@shared/hookguard";
import { LangProvider } from "@shared/ui/i18n";
import { ask, type SensitiveKind, type ShowVerdict } from "@/utils/messages";
import { getSettings } from "@/utils/settings";
import { effectiveLevel, type Verdict } from "@/utils/verdicts";

import { Banner } from "./Banner";
import "./content.css";
import { FormWarning } from "./FormWarning";
import { BADGE_SITES, installLinkBadges, installShortLinkPreview } from "./links";
import { calmPage, gamblingSignal, investmentSignal, pageText, shoppingSignal, techSupportSignal } from "./signals";

type Ui = ShadowRootContentScriptUi<Root>;

async function overlay(ctx: ContentScriptContext, name: string, render: (root: Root, ui: () => Ui) => void): Promise<Ui> {
  let ui: Ui | undefined = undefined;
  ui = await createShadowRootUi<Root>(ctx, {
    name,
    position: "inline",
    anchor: "body",
    append: "first",
    isolateEvents: true,
    onMount(container) {
      const root = createRoot(container);
      render(root, () => ui!);
      return root;
    },
    onRemove(root) {
      root?.unmount();
    },
  });
  ui.mount();
  return ui;
}

const SENSITIVE_NAME = {
  password: /pass|sifre|şifre|parola|pin\b/i,
  card: /card|kart|cc-?num|cvv|cvc|cvc2/i,
  tckn: /\btc\b|tckn|kimlik|identity/i,
};

/** What kind of secret an input is meant for, from its type and attributes. */
function fieldKind(el: HTMLInputElement): SensitiveKind | null {
  if (el.type === "password") return "password";
  const hint = `${el.name} ${el.id} ${el.autocomplete} ${el.placeholder} ${el.getAttribute("aria-label") ?? ""}`;
  if (/cc-number|cc-csc/.test(el.autocomplete) || SENSITIVE_NAME.card.test(hint)) return "card";
  if (SENSITIVE_NAME.tckn.test(hint)) return "tckn";
  return null;
}

/** What kind of secret has been typed, judged from the value on this device only. */
function valueKind(value: string): SensitiveKind | null {
  const digits = value.replace(/[\s-]/g, "");
  if (luhnValid(digits)) return "card";
  if (tcknValid(digits)) return "tckn";
  return null;
}

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  runAt: "document_idle",
  cssInjectionMode: "ui",

  async main(ctx) {
    const host = extractHost(location.href);
    if (!host) return;
    const settings = await getSettings();
    let verdict = await ask("verdict", { host });
    const trustedSite = verdict?.source === "allowlist" || Boolean(verdict?.details?.official_brand);

    // Banner
    let banner: Ui | null = null;
    let closed = false;
    const leave = () => void ask("leave");
    async function showBanner(v: Verdict | null) {
      if (!v || v.host !== host || closed) return;
      const level = effectiveLevel(v, settings.categoryProtection);
      if (level === "low") return;
      const draw = (root: Root, ui: () => Ui) =>
        root.render(
          <LangProvider value={settings.lang}>
            <Banner verdict={v} level={level} onLeave={leave} onClose={() => ((closed = true), ui().remove())} />
          </LangProvider>,
        );
      if (banner?.mounted) draw(banner.mounted, () => banner!);
      else banner = await overlay(ctx, "hookguard-banner", draw);
    }
    browser.runtime.onMessage.addListener((message: ShowVerdict) => {
      if (message?.type === "show") {
        verdict = message.verdict;
        void showBanner(message.verdict);
      }
    });
    await showBanner(verdict);

    // Form protection
    if (settings.formProtection && !trustedSite) {
      const warned = new Set<SensitiveKind>();
      let open = false;
      async function maybeWarn(kind: SensitiveKind, field: HTMLElement) {
        if (open || warned.has(kind)) return;
        warned.add(kind);
        const { warn, verdict: v } = await ask("form-check", { host: host!, kind });
        if (!warn) return;
        open = true;
        field.blur(); // stop typing into the page while the warning is up
        await overlay(ctx, "hookguard-form", (root, ui) =>
          root.render(
            <LangProvider value={settings.lang}>
              <FormWarning
              kind={kind}
              host={host!}
              verdict={v}
              onLeave={leave}
              onTrust={() => {
                void ask("trust-site", { host: host! });
                open = false;
                ui().remove();
              }}
              />
            </LangProvider>,
          ),
        );
      }
      const opts = { signal: ctx.signal, capture: true };
      document.addEventListener(
        "focusin",
        (e) => {
          if (e.target instanceof HTMLInputElement && fieldKind(e.target) === "password") void maybeWarn("password", e.target);
        },
        opts,
      );
      document.addEventListener(
        "input",
        (e) => {
          const el = e.target;
          if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
          const kind = (el instanceof HTMLInputElement ? fieldKind(el) : null) ?? valueKind(el.value);
          if (kind === "password" || (kind && valueKind(el.value) === kind)) void maybeWarn(kind, el);
        },
        opts,
      );
    }

    // Page signals, read once the page has settled; fake support screens are watched a little longer.
    if (!trustedSite) {
      const report = async (signal: ReturnType<typeof gamblingSignal>) => {
        if (!signal) return;
        const answer = await ask("page-signal", { host, signal });
        if (answer.verdict) await showBanner(answer.verdict);
      };
      if (settings.categoryProtection) {
        const text = pageText();
        const lang = settings.lang;
        await report(gamblingSignal(text, lang) ?? investmentSignal(text, lang) ?? shoppingSignal(text, verdict, lang));
      }
      if (settings.techSupport) {
        let found = false;
        const look = () => {
          const signal = found ? null : techSupportSignal(pageText(), settings.lang);
          if (!signal) return;
          found = true;
          calmPage();
          void report(signal);
        };
        look();
        document.addEventListener("fullscreenchange", look, { signal: ctx.signal });
        for (const delay of [1500, 4000, 8000]) ctx.setTimeout(look, delay);
      }
    }

    if (settings.shortLinkPreview) installShortLinkPreview(ctx.signal, settings.lang);
    if (settings.linkBadges && BADGE_SITES.has(location.hostname)) installLinkBadges(ctx.signal, settings.lang);
  },
});
