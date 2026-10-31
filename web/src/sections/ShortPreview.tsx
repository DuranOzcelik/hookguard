import { useEffect, useState } from "react";

import { displayLevel } from "@shared/content";
import { ApiError, openShortLink, type CheckResult } from "@shared/hookguard";
import { useLang } from "@shared/ui/i18n";
import { IconBack, IconExternal, IconLinkDuo, IconReasonDanger } from "@shared/ui/icons";
import { ResultView } from "@shared/ui/ResultView";

import { API_BASE } from "../checks";

const TEXT = {
  en: {
    eyebrow: "HookGuard short link",
    title: "Before you continue",
    lead: "This short link was made with HookGuard. We checked the site it leads to just now:",
    goesTo: "It leads to:",
    go: "Continue to the site",
    goAnyway: "I understand the risk, continue anyway",
    home: "Go to HookGuard",
    missing: "This short link does not exist or has been removed.",
    failed: "We could not check this short link right now. Please try again in a little while.",
  },
  tr: {
    eyebrow: "HookGuard kısa linki",
    title: "Devam etmeden önce",
    lead: "Bu kısa link HookGuard ile oluşturuldu. Gittiği siteyi az önce kontrol ettik:",
    goesTo: "Şuraya gidiyor:",
    go: "Siteye devam et",
    goAnyway: "Riski anlıyorum, yine de devam et",
    home: "HookGuard'a git",
    missing: "Bu kısa link yok ya da kaldırılmış.",
    failed: "Bu kısa linki şu an kontrol edemedik. Biraz sonra yeniden dene.",
  },
};

type State = { status: "loading" } | { status: "error"; message: string } | { status: "done"; url: string; result: CheckResult };

/** /s/CODE: where a HookGuard short link leads, checked again now, before the person goes on. */
export function ShortPreview({ code }: { code: string }) {
  const lang = useLang();
  const t = TEXT[lang];
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    openShortLink(API_BASE ?? "", code, lang).then(
      (link) => setState({ status: "done", url: link.url, result: link.result }),
      (err) => setState({ status: "error", message: err instanceof ApiError && err.status === 404 ? t.missing : t.failed }),
    );
  }, [code, lang, t.missing, t.failed]);

  const level = state.status === "done" ? displayLevel(state.result.level, state.result.category) : "low";

  return (
    <section className="hero hero--page" aria-labelledby="preview-title">
      <div className="aurora" aria-hidden="true">
        <span className="aurora__blob aurora__blob--a" />
        <span className="aurora__blob aurora__blob--b" />
      </div>
      <div className="hg-container page-narrow">
        <span className="hg-eyebrow">
          <IconLinkDuo aria-hidden="true" />
          {t.eyebrow}
        </span>
        <h1 id="preview-title">{t.title}</h1>
        {state.status === "loading" && <span className="hg-spinner" aria-label="…" />}
        {state.status === "error" && (
          <p className="hg-error error-box" role="alert">
            <IconReasonDanger aria-hidden="true" />
            {state.message}
          </p>
        )}
        {state.status === "done" && (
          <div className="result-stack">
            <p className="hero__lead">{t.lead}</p>
            <p className="destination">
              <span className="muted">{t.goesTo}</span> <span className="mono">{state.url}</span>
            </p>
            <ResultView
              result={state.result}
              lead={
                level === "high" ? (
                  <a className="hg-btn hg-btn--primary hg-btn--lg" href="/">
                    <IconBack aria-hidden="true" />
                    {t.home}
                  </a>
                ) : (
                  <a className={`hg-btn hg-btn--lg ${level === "low" ? "hg-btn--primary" : "hg-btn--secondary"}`} href={state.url} rel="noreferrer noopener">
                    <IconExternal aria-hidden="true" />
                    {t.go}
                  </a>
                )
              }
            />
            {level === "high" && (
              <p className="continue">
                <a className="hg-link-btn" href={state.url} rel="noreferrer noopener">
                  {t.goAnyway}
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
