import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";

import { expandLink, extractHost, isShortLink, openShortLink, shortenLink, checkDomain, type CheckResult } from "@shared/hookguard";
import { useLang } from "@shared/ui/i18n";
import { IconCheck, IconCopy, IconExternal, IconLink, IconLinkDuo, IconLock, IconReasonDanger, IconScissors } from "@shared/ui/icons";
import { ResultView, StatusBand } from "@shared/ui/ResultView";
import { displayLevel } from "@shared/content";

import { API_BASE, atLeast, errorMessage } from "./Checker";

const TEXT = {
  en: {
    eyebrow: "Short links",
    title: ["Short links,", "without surprises."],
    lead: "See where a short link really goes before you tap it, or make your own short link that shows a safety check to everyone who opens it.",
    tabs: { expand: "Expand a short link", shorten: "Shorten safely" },
    expandLabel: "Paste a short link (bit.ly, t.co, tinyurl…)",
    expandButton: "Show where it goes",
    expandNote: "To see where it leads, the short link itself is sent to our server. We only read the redirect; the destination site is never opened.",
    notShort: "This is not a short link. Paste it on the home page to check it directly.",
    goesTo: "This short link goes to:",
    noDestination: "We could not find where this short link leads. Ask the person who sent it before you tap it.",
    shortenLabel: "Paste the long link you want to shorten",
    shortenButton: "Shorten safely",
    shortenNote: "We check where the link leads before shortening it, and do not shorten dangerous links. The full link is stored so the short link can work.",
    refused: "We did not shorten this link, because the site it leads to looks dangerous.",
    ready: "Your safe short link is ready",
    readyNote: "Anyone who opens it first sees a safety check of the destination.",
    copy: "Copy",
    copied: "Copied",
    preview: "Open the preview",
    alreadyShort: "This is already a short link. Use “Expand a short link” to see where it goes.",
    notLink: "This does not look like a web address. Try pasting the link exactly as you received it.",
    tooMany: "Too many requests. Please try again in a minute.",
    failed: "We cannot do this right now. Please try again in a little while.",
    offline: "Could not reach the server. Check your internet connection and try again.",
    working: "Working…",
    why: [
      ["Why are short links risky?", "Short links hide the real address. Scammers use them so you cannot see that “ptt-kargo” is not the real courier until it is too late."],
      ["How is a HookGuard short link different?", "Before anyone reaches the site, they see where the link goes and a fresh safety check. If the site turns dangerous later, they are warned."],
    ],
  },
  tr: {
    eyebrow: "Kısa linkler",
    title: ["Kısa linkler,", "sürprizsiz."],
    lead: "Bir kısa linkin gerçekte nereye gittiğini dokunmadan önce gör ya da açan herkese önce güvenlik kontrolü gösteren kendi kısa linkini oluştur.",
    tabs: { expand: "Kısa link aç", shorten: "Güvenle kısalt" },
    expandLabel: "Kısa linki yapıştır (bit.ly, t.co, tinyurl…)",
    expandButton: "Nereye gittiğini göster",
    expandNote: "Nereye gittiğini görmek için kısa linkin kendisi sunucumuza gönderilir. Yalnızca yönlendirmeyi okuruz; gideceği site açılmaz.",
    notShort: "Bu bir kısa link değil. Doğrudan kontrol etmek için ana sayfaya yapıştır.",
    goesTo: "Bu kısa link şuraya gidiyor:",
    noDestination: "Bu kısa linkin nereye gittiğini bulamadık. Dokunmadan önce linki gönderen kişiye sor.",
    shortenLabel: "Kısaltmak istediğin uzun linki yapıştır",
    shortenButton: "Güvenle kısalt",
    shortenNote: "Kısaltmadan önce linkin nereye gittiğine bakarız; tehlikeli linkleri kısaltmayız. Kısa linkin çalışması için linkin tamamı saklanır.",
    refused: "Bu linki kısaltmadık, çünkü gittiği site tehlikeli görünüyor.",
    ready: "Güvenli kısa linkin hazır",
    readyNote: "Açan herkes önce gideceği sitenin güvenlik kontrolünü görür.",
    copy: "Kopyala",
    copied: "Kopyalandı",
    preview: "Önizlemeyi aç",
    alreadyShort: "Bu zaten kısa bir link. Nereye gittiğini görmek için “Kısa link aç”ı kullan.",
    notLink: "Bu bir web adresine benzemiyor. Linki olduğu gibi yapıştırmayı dene.",
    tooMany: "Çok fazla istek yapıldı. Bir dakika sonra yeniden dene.",
    failed: "Şu an yapamıyoruz. Biraz sonra yeniden dene.",
    offline: "Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip yeniden dene.",
    working: "Hazırlanıyor…",
    why: [
      ["Kısa linkler neden riskli?", "Kısa linkler asıl adresi gizler. Dolandırıcılar onları, “ptt-kargo”nun gerçek kargo firması olmadığını iş işten geçene kadar görmeyesin diye kullanır."],
      ["HookGuard kısa linki neden farklı?", "Siteye ulaşmadan önce herkes linkin nereye gittiğini ve güncel bir güvenlik kontrolünü görür. Site sonradan tehlikeli hâle gelirse uyarılır."],
    ],
  },
};

type Tab = "expand" | "shorten";
type Expanded = { status: "idle" } | { status: "busy" } | { status: "error"; message: string } | { status: "done"; result: CheckResult };
type Short = { status: "idle" } | { status: "busy" } | { status: "error"; message: string } | { status: "done"; url: string | null; result: CheckResult };

/** A HookGuard short link pasted into the expander: /s/CODE on this site. */
function ownCode(text: string): string | null {
  try {
    const url = new URL(text.trim(), location.origin);
    return url.origin === location.origin ? (url.pathname.match(/^\/s\/([A-Za-z0-9]{7})$/)?.[1] ?? null) : null;
  } catch {
    return null;
  }
}

function ExpandTab() {
  const lang = useLang();
  const t = TEXT[lang];
  const [input, setInput] = useState("");
  const [state, setState] = useState<Expanded>({ status: "idle" });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const code = ownCode(input);
    const host = extractHost(input);
    if (!code && !isShortLink(host)) return setState({ status: "error", message: host ? t.notShort : t.notLink });
    setState({ status: "busy" });
    try {
      if (code) {
        const link = await atLeast(openShortLink(API_BASE, code, lang));
        setState({ status: "done", result: link.result });
        return;
      }
      const { destination } = await atLeast(expandLink(API_BASE, input.trim()));
      if (!destination) return setState({ status: "error", message: t.noDestination });
      setState({ status: "done", result: await checkDomain(API_BASE, destination, { lang }) });
    } catch (err) {
      setState({ status: "error", message: errorMessage(t, err) });
    }
  }

  return (
    <>
      <form className="tool-form" onSubmit={submit} noValidate>
        <label className="check-form__label" htmlFor="short-in">
          {t.expandLabel}
        </label>
        <div className="check-form__row">
          <div className="check-form__field">
            <IconLink className="check-form__icon" aria-hidden="true" />
            <input id="short-in" type="text" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://bit.ly/…"
              value={input} onChange={(e) => setInput(e.target.value)} aria-describedby="expand-note" />
          </div>
          <button className="hg-btn hg-btn--primary hg-btn--lg check-form__submit" type="submit" disabled={state.status === "busy"}>
            {state.status === "busy" ? <span className="hg-spinner" aria-hidden="true" /> : <IconLinkDuo aria-hidden="true" />}
            {state.status === "busy" ? t.working : t.expandButton}
          </button>
        </div>
        <p className="hg-note" id="expand-note">
          <IconLock aria-hidden="true" />
          {t.expandNote}
        </p>
      </form>
      {state.status === "error" && (
        <p className="hg-error error-box" role="alert">
          <IconReasonDanger aria-hidden="true" />
          {state.message}
        </p>
      )}
      {state.status === "done" && (
        <div className="result-stack">
          <p className="hg-note">
            <IconLink aria-hidden="true" />
            <span>
              {t.goesTo} <strong className="mono">{state.result.domain}</strong>
            </span>
          </p>
          <ResultView result={state.result} />
        </div>
      )}
    </>
  );
}

function ShortenTab() {
  const lang = useLang();
  const t = TEXT[lang];
  const reduce = useReducedMotion();
  const [input, setInput] = useState("");
  const [state, setState] = useState<Short>({ status: "idle" });
  const [copied, setCopied] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const host = extractHost(input);
    if (!host) return setState({ status: "error", message: t.notLink });
    if (isShortLink(host)) return setState({ status: "error", message: t.alreadyShort });
    setState({ status: "busy" });
    setCopied(false);
    try {
      const made = await atLeast(shortenLink(API_BASE, input.trim(), lang));
      setState({ status: "done", url: made.path ? `${location.origin}${made.path}` : null, result: made.result });
    } catch (err) {
      setState({ status: "error", message: errorMessage(t, err) });
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <form className="tool-form" onSubmit={submit} noValidate>
        <label className="check-form__label" htmlFor="long-in">
          {t.shortenLabel}
        </label>
        <div className="check-form__row">
          <div className="check-form__field">
            <IconLink className="check-form__icon" aria-hidden="true" />
            <input id="long-in" type="text" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://…"
              value={input} onChange={(e) => setInput(e.target.value)} aria-describedby="shorten-note" />
          </div>
          <button className="hg-btn hg-btn--primary hg-btn--lg check-form__submit" type="submit" disabled={state.status === "busy"}>
            {state.status === "busy" ? <span className="hg-spinner" aria-hidden="true" /> : <IconScissors aria-hidden="true" />}
            {state.status === "busy" ? t.working : t.shortenButton}
          </button>
        </div>
        <p className="hg-note" id="shorten-note">
          <IconLock aria-hidden="true" />
          {t.shortenNote}
        </p>
      </form>
      {state.status === "error" && (
        <p className="hg-error error-box" role="alert">
          <IconReasonDanger aria-hidden="true" />
          {state.message}
        </p>
      )}
      {state.status === "done" && !state.url && (
        <div className="result-stack">
          <p className="hg-error error-box" role="alert">
            <IconReasonDanger aria-hidden="true" />
            {t.refused}
          </p>
          <ResultView result={state.result} />
        </div>
      )}
      {state.status === "done" && state.url && (
        <motion.div
          className="short-result hg-glass hg-gradient-edge"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          role="status"
        >
          <h2 className="short-result__title">{t.ready}</h2>
          <div className="short-result__link">
            <span className="mono">{state.url}</span>
            <button type="button" className="hg-btn hg-btn--primary" onClick={() => void copy(state.url!)}>
              {copied ? <IconCheck aria-hidden="true" /> : <IconCopy aria-hidden="true" />}
              {copied ? t.copied : t.copy}
            </button>
          </div>
          <p className="muted">{t.readyNote}</p>
          <div className="hg-result short-result__status">
            <StatusBand result={state.result} level={displayLevel(state.result.level, state.result.category)} />
          </div>
          <a className="hg-btn hg-btn--secondary" href={state.url}>
            <IconExternal aria-hidden="true" />
            {t.preview}
          </a>
        </motion.div>
      )}
    </>
  );
}

export function ShortLinks() {
  const t = TEXT[useLang()];
  const [tab, setTab] = useState<Tab>("expand");
  const tabs = useRef<Record<Tab, HTMLButtonElement | null>>({ expand: null, shorten: null });

  function onKey(e: KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const next: Tab = tab === "expand" ? "shorten" : "expand";
    setTab(next);
    tabs.current[next]?.focus();
  }

  return (
    <section className="hero hero--page" aria-labelledby="short-title">
      <div className="aurora" aria-hidden="true">
        <span className="aurora__blob aurora__blob--a" />
        <span className="aurora__blob aurora__blob--b" />
      </div>
      <div className="hg-container page-narrow">
        <span className="hg-eyebrow">
          <IconLinkDuo aria-hidden="true" />
          {t.eyebrow}
        </span>
        <h1 id="short-title">
          {t.title[0]} <span className="hg-gradient-text">{t.title[1]}</span>
        </h1>
        <p className="hero__lead">{t.lead}</p>

        <div className="tool hg-glass hg-gradient-edge">
          <div className="tabs" role="tablist" aria-label={t.eyebrow} onKeyDown={onKey}>
            {(["expand", "shorten"] as Tab[]).map((key) => (
              <button
                key={key}
                ref={(el) => {
                  tabs.current[key] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${key}`}
                aria-selected={tab === key}
                aria-controls={`panel-${key}`}
                tabIndex={tab === key ? 0 : -1}
                className="tabs__tab"
                onClick={() => setTab(key)}
              >
                {key === "expand" ? <IconLinkDuo aria-hidden="true" /> : <IconScissors aria-hidden="true" />}
                {t.tabs[key]}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="tool__panel">
            {tab === "expand" ? <ExpandTab /> : <ShortenTab />}
          </div>
        </div>

        <div className="why-grid">
          {t.why.map(([title, text]) => (
            <div key={title} className="hg-card">
              <h2 className="hg-subtitle">{title}</h2>
              <p className="muted">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
