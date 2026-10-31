import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";

import { ApiError, extractHost, isShortLink, type CheckResult } from "@shared/hookguard";
import { useContent, useLang } from "@shared/ui/i18n";
import {
  IconAnalyze,
  IconClose,
  IconDanger,
  IconFlag,
  IconLink,
  IconLock,
  IconReasonDanger,
  IconSparkle,
} from "@shared/ui/icons";
import { ReportForm } from "@shared/ui/ReportForm";
import { ResultView } from "@shared/ui/ResultView";

import { ON_DEVICE, checkHost, expandShortLink, report } from "../checks";
import { extensionInstalled } from "../extension";
const MIN_LOADING_MS = 400;

// Made-up addresses on the reserved .example domain (they can never be real sites) and one official site.
// dhl-parcel-redelivery.example is on the known-threat list on purpose (TEST_ENTRIES in backend/references.py).
const EXAMPLES = ["dhl-parcel-redelivery.example", "steam-gift-claim.example", "casino-bonus845.example", "paypal.com"];

const TEXT = {
  en: {
    eyebrow: "Free · No sign-up · Private",
    title: ["Check before", "you click."],
    lead: "Got a link by SMS, WhatsApp or email? Paste it here and we will tell you in seconds whether it is a scam site.",
    label: "Paste the suspicious link here",
    clear: "Clear the box",
    submit: "Check",
    checking: "Checking…",
    sending: "Only this will be sent:",
    onDevice: "The check runs in your browser: the link is not sent anywhere.",
    examples: "Try an example:",
    examplesNote: "Addresses ending in “.example” are not real; they are made up for trying the checker.",
    shortTitle: "This is a shortened link",
    shortBody: (host: string) =>
      `Services like ${host} hide the real address. To see where it leads, the whole short link has to be sent to our server. We never open the destination; we only learn its name and check it.`,
    shortButton: "Show where it leads",
    shortWithExtension: (host: string) =>
      `Services like ${host} hide the real address. Your HookGuard extension can read where it leads without opening the site.`,
    shortNoExtension: (host: string) =>
      `Services like ${host} hide the real address, and a web page cannot see where it leads without opening it. The HookGuard extension can: it reads where the link goes and checks that site before you get there.`,
    shortGetExtension: "Get the extension",
    via: (short: string) => `The short link ${short} leads to:`,
    report: "Report this site",
    reportLow: "Report it if it seems suspicious",
    notLink: "This does not look like a web address. Try pasting the link exactly as you received it.",
    tooMany: "Too many checks. Please try again in a minute.",
    failed: "We cannot check right now. Please try again in a little while.",
    offline: "Could not connect. Check your internet connection and try again.",
    noDestination: "We could not find where this short link leads. Ask the person who sent it before you click.",
    phone: {
      label: "Example: a scam text message that HookGuard marks as dangerous",
      sender: "+•• •••• ••• 237",
      time: "Today 14:02",
      message: "Your parcel could not be delivered. Update your address within 24 hours:",
      verdict: "Dangerous",
      verdictText: "Very likely a scam site. Do not click.",
    },
  },
  tr: {
    eyebrow: "Ücretsiz · Üyelik yok · Gizli",
    title: ["Tıklamadan önce", "emin ol."],
    lead: "SMS'le, WhatsApp'tan ya da e-postayla gelen bir link mi var? Buraya yapıştır; dolandırıcılık sitesi olup olmadığını birkaç saniyede söyleyelim.",
    label: "Şüpheli linki buraya yapıştır",
    clear: "Kutuyu temizle",
    submit: "Kontrol et",
    checking: "Kontrol ediliyor…",
    sending: "Gönderilecek olan yalnızca:",
    onDevice: "Kontrol tarayıcının içinde yapılır: link hiçbir yere gönderilmez.",
    examples: "Örnek dene:",
    examplesNote: "“.example” ile biten adresler gerçek değildir; denemen için uydurulmuştur.",
    shortTitle: "Bu kısaltılmış bir link",
    shortBody: (host: string) =>
      `${host} gibi servisler asıl adresi gizler. Nereye gittiğini görmek için kısa linkin tamamını sunucumuza göndermemiz gerekiyor. Gideceği siteyi açmayız; yalnızca adını öğrenip kontrol ederiz.`,
    shortButton: "Nereye gittiğini göster",
    shortWithExtension: (host: string) =>
      `${host} gibi servisler asıl adresi gizler. HookGuard eklentin, siteyi açmadan nereye gittiğini okuyabilir.`,
    shortNoExtension: (host: string) =>
      `${host} gibi servisler asıl adresi gizler ve bir web sayfası, linki açmadan nereye gittiğini göremez. HookGuard eklentisi görebilir: linkin nereye gittiğini okur ve sen oraya varmadan o siteyi kontrol eder.`,
    shortGetExtension: "Eklentiyi edin",
    via: (short: string) => `${short} kısa linki şu adrese gidiyor:`,
    report: "Bu siteyi bildir",
    reportLow: "Şüpheliyse bildir",
    notLink: "Bu bir web adresine benzemiyor. Linki olduğu gibi yapıştırmayı dene.",
    tooMany: "Çok fazla kontrol yapıldı. Bir dakika sonra yeniden dene.",
    failed: "Şu an kontrol edemiyoruz. Biraz sonra yeniden dene.",
    offline: "Bağlanılamadı. İnternet bağlantını kontrol edip yeniden dene.",
    noDestination: "Bu kısa linkin nereye gittiğini bulamadık. Tıklamadan önce linki gönderen kişiye sor.",
    phone: {
      label: "Örnek: HookGuard'ın tehlikeli diye işaretlediği dolandırıcı bir SMS",
      sender: "+•• •••• ••• 237",
      time: "Bugün 14:02",
      message: "Kargonuz teslim edilemedi. 24 saat içinde adresinizi güncelleyin:",
      verdict: "Tehlikeli",
      verdictText: "Büyük olasılıkla dolandırıcılık sitesi. Tıklama.",
    },
  },
};

type Text = (typeof TEXT)["en"];
type State =
  | { status: "idle" }
  | { status: "loading"; host: string }
  | { status: "short"; link: string; host: string; extension: boolean }
  | { status: "done"; result: CheckResult; via?: string }
  | { status: "error"; message: string };

export function errorMessage(t: Pick<Text, "notLink" | "tooMany" | "failed" | "offline">, err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 422) return t.notLink;
    if (err.status === 429) return t.tooMany;
    return t.failed;
  }
  return t.offline;
}

export async function atLeast<T>(promise: Promise<T>, ms = MIN_LOADING_MS): Promise<T> {
  const [value] = await Promise.all([promise, new Promise((r) => setTimeout(r, ms))]);
  return value;
}

/** The illustration: a scam SMS with HookGuard's verdict on it. Decorative, described by its label. */
function PhoneScene({ t }: { t: Text["phone"] }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="phone-scene"
      role="img"
      aria-label={t.label}
      initial={reduce ? false : { opacity: 0, y: 24, rotate: 2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="phone" aria-hidden="true">
        <div className="phone__notch" />
        <div className="phone__head">
          <span className="phone__avatar">?</span>
          <span className="phone__sender">{t.sender}</span>
        </div>
        <p className="phone__time">{t.time}</p>
        <div className="phone__bubble">
          {t.message} <span className="phone__link">dhl-parcel-redelivery.example/t/8Kq2</span>
        </div>
        <motion.div
          className="phone__verdict tone-danger"
          initial={reduce ? false : { opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <IconDanger aria-hidden="true" />
          <div>
            <strong>{t.verdict}</strong>
            <span>{t.verdictText}</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function Checker() {
  const lang = useLang();
  const t = TEXT[lang];
  const c = useContent();
  const reduce = useReducedMotion();
  const [input, setInput] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [reporting, setReporting] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const pasted = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const host = extractHost(input);

  useEffect(() => {
    if (state.status === "done") {
      titleRef.current?.focus({ preventScroll: true });
      titleRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }
  }, [state, reduce]);

  async function check(target: string, via?: string) {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setReporting(false);
    setState({ status: "loading", host: target });
    try {
      const result = await atLeast(checkHost(target, lang, controller.signal));
      setState({ status: "done", result, via });
    } catch (err) {
      if (!controller.signal.aborted) setState({ status: "error", message: errorMessage(t, err) });
    }
  }

  async function start(text: string) {
    const target = extractHost(text);
    if (!target) return setState({ status: "error", message: t.notLink });
    if (!isShortLink(target)) return void check(target);
    const extension = ON_DEVICE && (await extensionInstalled());
    setState({ status: "short", link: text.trim(), host: target, extension });
  }

  async function followShortLink(link: string, short: string) {
    setState({ status: "loading", host: short });
    try {
      const destination = await atLeast(expandShortLink(link));
      if (destination) await check(destination, short);
      else setState({ status: "error", message: t.noDestination });
    } catch (err) {
      setState({ status: "error", message: errorMessage(t, err) });
    }
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
    if (pasted.current && extractHost(e.target.value)) void start(e.target.value); // a pasted link is checked at once
    pasted.current = false;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void start(input);
  }

  const loading = state.status === "loading";

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="aurora" aria-hidden="true">
        {["a", "b", "c"].map((k, i) => (
          <motion.span
            key={k}
            className={`aurora__blob aurora__blob--${k}`}
            animate={reduce ? undefined : { x: ["0%", i % 2 ? "-8%" : "8%", "0%"], y: ["0%", i === 1 ? "10%" : "-6%", "0%"] }}
            transition={{ duration: 16 + i * 4, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
      <div className="hg-container hero__grid">
        <div className="hero__main">
          <motion.div
            className="hero__copy"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="hg-eyebrow">
              <IconSparkle aria-hidden="true" />
              {t.eyebrow}
            </span>
            <h1 id="hero-title">
              {t.title[0]} <span className="hg-gradient-text">{t.title[1]}</span>
            </h1>
            <p className="hero__lead">{t.lead}</p>
          </motion.div>

          <form className="check-form hg-glass hg-gradient-edge" onSubmit={onSubmit} noValidate>
            <label className="check-form__label" htmlFor="link">
              {t.label}
            </label>
            <div className="check-form__row">
              <div className="check-form__field">
                <IconLink className="check-form__icon" aria-hidden="true" />
                <input
                  id="link"
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="https://…"
                  value={input}
                  onChange={onChange}
                  onPaste={() => (pasted.current = true)}
                  aria-describedby="privacy-note"
                  aria-invalid={state.status === "error"}
                />
                {input && (
                  <button
                    type="button"
                    className="check-form__clear"
                    aria-label={t.clear}
                    onClick={() => {
                      setInput("");
                      setState({ status: "idle" });
                    }}
                  >
                    <IconClose aria-hidden="true" />
                  </button>
                )}
              </div>
              <button className="hg-btn hg-btn--primary hg-btn--lg check-form__submit" type="submit" disabled={loading}>
                {loading ? <span className="hg-spinner" aria-hidden="true" /> : <IconAnalyze aria-hidden="true" />}
                {loading ? t.checking : t.submit}
              </button>
            </div>
            <p className="hg-note privacy-note" id="privacy-note">
              <IconLock aria-hidden="true" />
              <span>
                {ON_DEVICE ? t.onDevice : c.privacyNote}
                {!ON_DEVICE && host && !isShortLink(host) && (
                  <>
                    {" "}
                    {t.sending} <strong className="mono">{host}</strong>
                  </>
                )}
              </span>
            </p>
            <div className="examples">
              <span className="examples__label">{t.examples}</span>
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="hg-chip mono"
                  onClick={() => {
                    setInput(example);
                    void start(example);
                  }}
                >
                  {example}
                </button>
              ))}
              <p className="examples__note">{t.examplesNote}</p>
            </div>
          </form>
        </div>
        <PhoneScene t={t.phone} />
      </div>

      <div className="hg-container hero__result">
        {state.status === "loading" && (
          <p className="checking" role="status">
            <span className="hg-spinner" aria-hidden="true" />
            <span>
              <strong className="mono">{state.host}</strong> · {t.checking}
            </span>
          </p>
        )}
        {state.status === "error" && (
          <p className="hg-error error-box" role="alert">
            <IconReasonDanger aria-hidden="true" />
            {state.message}
          </p>
        )}
        {state.status === "short" && (
          <div className="hg-callout tone-brand" role="status">
            <h2 className="hg-callout__title">
              <IconLink aria-hidden="true" />
              {t.shortTitle}
            </h2>
            <p>
              {!ON_DEVICE ? t.shortBody(state.host) : state.extension ? t.shortWithExtension(state.host) : t.shortNoExtension(state.host)}
            </p>
            <div className="hg-actions">
              {ON_DEVICE && !state.extension ? (
                <a className="hg-btn hg-btn--primary" href="#install">
                  {t.shortGetExtension}
                </a>
              ) : (
                <button type="button" className="hg-btn hg-btn--primary" onClick={() => void followShortLink(state.link, state.host)}>
                  {t.shortButton}
                </button>
              )}
            </div>
          </div>
        )}
        {state.status === "done" && (
          <div className="result-stack">
            {state.via && (
              <p className="hg-note">
                <IconLink aria-hidden="true" />
                <span>
                  {t.via(state.via)} <strong className="mono">{state.result.domain}</strong>
                </span>
              </p>
            )}
            <ResultView
              result={state.result}
              titleRef={titleRef}
              actions={
                <button type="button" className="hg-btn hg-btn--secondary" aria-expanded={reporting} onClick={() => setReporting(!reporting)}>
                  <IconFlag aria-hidden="true" />
                  {state.result.level === "low" ? t.reportLow : t.report}
                </button>
              }
            />
            {reporting && (
              <div className="hg-card">
                <h3 className="hg-subtitle">{c.report.title}</h3>
                <ReportForm
                  domain={state.result.domain}
                  onGitHub={ON_DEVICE}
                  onSubmit={(category, note) => report(state.result.domain, category, note)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
