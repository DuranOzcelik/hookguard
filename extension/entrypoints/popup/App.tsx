import { useEffect, useState } from "react";
import { browser } from "wxt/browser";

import { extractHost } from "@shared/hookguard";
import { useContent, useLang } from "@shared/ui/i18n";
import { IconFamily, IconFlag, IconReasonInfo } from "@shared/ui/icons";
import { Logo } from "@shared/ui/Logo";
import { ReportForm } from "@shared/ui/ReportForm";
import { ReasonList, StatusBand } from "@shared/ui/ResultView";
import RefreshIcon from "~icons/solar/refresh-linear";
import SettingsIcon from "~icons/solar/settings-linear";
import { ask, type Status } from "@/utils/messages";
import { effectiveLevel, type Verdict } from "@/utils/verdicts";

const TEXT = {
  en: {
    settings: "Settings",
    family: "Family mode is on.",
    none: "This page is not checked: it is a browser page or a local address.",
    loading: "Checking…",
    failed: (host: string) => `No result for ${host} right now. Please try again in a little while.`,
    recheck: "Check again",
    report: "Report",
    week: "This week",
    checked: "Checked",
    warned: "Warnings",
    stopped: "Stopped",
    list: (n: string, when: string) => `Local list: ${n} known scam addresses.${when ? ` Updated ${when}.` : ""}`,
  },
  tr: {
    settings: "Ayarlar",
    family: "Aile modu açık.",
    none: "Bu sayfa kontrol edilmiyor: tarayıcının kendi sayfası ya da bir yerel adres.",
    loading: "Kontrol ediliyor…",
    failed: (host: string) => `${host} için şu an sonuç alınamadı. Biraz sonra yeniden dene.`,
    recheck: "Yeniden kontrol et",
    report: "Bildir",
    week: "Bu hafta",
    checked: "Kontrol",
    warned: "Uyarı",
    stopped: "Durdurulan",
    list: (n: string, when: string) => `Yerel liste: ${n} bilinen dolandırıcılık adresi.${when ? ` Son güncelleme: ${when}.` : ""}`,
  },
};

type Check = { status: "none" } | { status: "loading" } | { status: "done"; verdict: Verdict | null };

/** The host shown in the active tab; on the warning page, the host it warns about. */
async function activeHost(): Promise<string | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  const warning = browser.runtime.getURL("/warning.html");
  if (tab.url.startsWith(warning)) return new URL(tab.url).searchParams.get("host");
  return /^https?:/i.test(tab.url) ? extractHost(tab.url) : null;
}

export default function App() {
  const c = useContent();
  const t = TEXT[useLang()];
  const [host, setHost] = useState<string | null>(null);
  const [check, setCheck] = useState<Check>({ status: "loading" });
  const [status, setStatus] = useState<Status | null>(null);
  const [reporting, setReporting] = useState(false);

  async function run(target: string, fresh = false) {
    setCheck({ status: "loading" });
    setCheck({ status: "done", verdict: await ask("verdict", { host: target, fresh }) });
    setStatus(await ask("status"));
  }

  useEffect(() => {
    void (async () => {
      const target = await activeHost();
      setHost(target);
      setStatus(await ask("status"));
      if (target) await run(target);
      else setCheck({ status: "none" });
    })();
  }, []);

  const verdict = check.status === "done" ? check.verdict : null;
  const level = verdict ? effectiveLevel(verdict, status?.settings.categoryProtection ?? true) : "low";
  const steps = (verdict?.category && c.categorySteps[verdict.category.id]) || c.whatToDo[level];
  const stats = status?.stats;
  const n = (x: number) => x.toLocaleString(c.locale);

  return (
    <main className="popup">
      <header className="popup__head">
        <Logo />
        <button
          type="button"
          className="hg-btn hg-btn--ghost hg-btn--icon"
          aria-label={t.settings}
          title={t.settings}
          onClick={() => void browser.runtime.openOptionsPage()}
        >
          <SettingsIcon aria-hidden="true" />
        </button>
      </header>

      {status?.settings.family.enabled && (
        <p className="hg-note">
          <IconFamily aria-hidden="true" />
          {t.family}
        </p>
      )}

      {check.status === "none" && (
        <p className="hg-note">
          <IconReasonInfo aria-hidden="true" />
          {t.none}
        </p>
      )}
      {check.status === "loading" && <p className="hg-note">{t.loading}</p>}
      {check.status === "done" && !verdict && host && (
        <p className="hg-error" role="alert">
          {t.failed(host)}
        </p>
      )}

      {verdict && host && (
        <section className="hg-result">
          <StatusBand result={{ ...verdict, domain: host }} level={level} as="h1" />
          <div className="hg-result__body">
            <div>
              <h2 className="hg-subtitle">{c.ui.why}</h2>
              <ReasonList reasons={verdict.reasons.slice(0, 3)} />
            </div>
            {level !== "low" && (
              <div className={`tone-${level === "high" ? "danger" : "caution"}`}>
                <h2 className="hg-subtitle">{c.ui.whatToDo}</h2>
                <ol className="hg-steps">
                  {steps.slice(0, 2).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
            )}
            <div className="hg-actions">
              <button type="button" className="hg-btn hg-btn--secondary" onClick={() => void run(host, true)}>
                <RefreshIcon aria-hidden="true" />
                {t.recheck}
              </button>
              <button type="button" className="hg-btn hg-btn--secondary" aria-expanded={reporting} onClick={() => setReporting(!reporting)}>
                <IconFlag aria-hidden="true" />
                {t.report}
              </button>
            </div>
            {reporting && (
              <ReportForm
                domain={host}
                initial={level === "low" ? "phishing" : "false_positive"}
                onSubmit={async (category, note) => {
                  const { ok } = await ask("report", { domain: host, category, note });
                  if (!ok) throw new Error("report failed");
                }}
              />
            )}
          </div>
        </section>
      )}

      {stats && (
        <section aria-labelledby="week-title">
          <h2 id="week-title" className="hg-subtitle">
            {t.week}
          </h2>
          <dl className="stats">
            <div>
              <dt>{t.checked}</dt>
              <dd>{n(stats.checked)}</dd>
            </div>
            <div>
              <dt>{t.warned}</dt>
              <dd>{n(stats.warned + stats.forms)}</dd>
            </div>
            <div>
              <dt>{t.stopped}</dt>
              <dd>{n(stats.blocked + stats.downloads)}</dd>
            </div>
          </dl>
        </section>
      )}

      {status && (
        <p className="fine">
          {t.list(n(status.lists.counts.blocklist ?? 0), status.lists.checkedAt ? new Date(status.lists.checkedAt).toLocaleString(c.locale) : "")}
        </p>
      )}
    </main>
  );
}
