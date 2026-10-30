import { useEffect, useRef, useState, type FormEvent } from "react";
import { browser } from "wxt/browser";

import { extractHost } from "@shared/hookguard";
import { useContent, useLang } from "@shared/ui/i18n";
import { IconBack, IconDownload, IconFamily, IconFlag, IconLock, IconReasonDanger, IconReasonSafe } from "@shared/ui/icons";
import { Logo } from "@shared/ui/Logo";
import { ReportForm } from "@shared/ui/ReportForm";
import { CategoryCallout, ReasonList, ResultView, type ResultModel } from "@shared/ui/ResultView";
import { ask } from "@/utils/messages";
import type { Verdict } from "@/utils/verdicts";

const TEXT = {
  en: {
    title: "HookGuard: dangerous site",
    stopped: "HookGuard stopped this page before it opened",
    stoppedScam: "HookGuard stopped this fake warning page",
    back: "Back to safety",
    falseAlarm: "False alarm? Report it",
    report: "Report",
    continue: ["If you know and trust this site, ", "I understand the risk, open it anyway", ". You will not be asked again for this site during this session."],
    familyBrand: "Family mode",
    familyTitle: "This site is locked by family mode",
    familyText: (what: string | null) => `Family mode is on on this computer. ${what ? `It was stopped because it is: ${what}.` : "This site was stopped before it opened."}`,
    pinLabel: "Parent PIN to open it",
    unlock: "Unlock",
    wrongPin: "Wrong PIN.",
    downloadBrand: "HookGuard stopped this download",
    downloadTitle: "Stop before you open this file",
    from: (host: string) => `It comes from ${host}.`,
    fromUnknown: "We do not know where it comes from.",
    apk: "This is a phone app file. Banks and couriers never send their apps as files; install apps only from Google Play. Fake bank and parcel apps can read your text messages and empty your account.",
    exe: "This file can run programs on your computer, and it comes from an unknown or risky site. If you are not sure what it is, do not open it.",
    aboutSite: "About this site",
    cancel: "Cancel the download",
    resume: "Download anyway",
    resumed: "The download continues. Think twice before you open the file.",
    cancelled: "The download was cancelled.",
    removed: "The file had already downloaded; it has been deleted.",
    tooLate: "The file has already downloaded. Delete it without opening it.",
  },
  tr: {
    title: "HookGuard: tehlikeli site",
    stopped: "HookGuard bu sayfayı açılmadan durdurdu",
    stoppedScam: "HookGuard bu sahte uyarı sayfasını durdurdu",
    back: "Güvenli sayfaya dön",
    falseAlarm: "Yanlış uyarı mı? Bildir",
    report: "Bildir",
    continue: ["Siteyi tanıyorsan ve güveniyorsan ", "riski anlıyorum, yine de aç", ". Bu oturum boyunca bu site için bir daha sorulmaz."],
    familyBrand: "Aile modu",
    familyTitle: "Bu site aile modunda kilitli",
    familyText: (what: string | null) => `Bu bilgisayarda aile modu açık. ${what ? `Şu nedenle açılmadan durduruldu: ${what}.` : "Bu site açılmadan durduruldu."}`,
    pinLabel: "Açmak için ebeveyn PIN'i",
    unlock: "Kilidi aç",
    wrongPin: "PIN yanlış.",
    downloadBrand: "HookGuard bu indirmeyi durdurdu",
    downloadTitle: "Bu dosyayı açmadan önce dur",
    from: (host: string) => `${host} adresinden geliyor.`,
    fromUnknown: "Nereden geldiği bilinmiyor.",
    apk: "Bu bir telefon uygulaması dosyası. Bankalar ve kargo firmaları uygulamalarını dosya olarak göndermez; uygulamaları yalnızca Google Play'den yükle. Sahte banka ve kargo uygulamaları SMS'lerini okuyup hesabını boşaltabilir.",
    exe: "Bu dosya bilgisayarında program çalıştırabilir ve tanınmayan ya da riskli bir siteden geliyor. Ne olduğundan emin değilsen açma.",
    aboutSite: "Bu site hakkında",
    cancel: "İndirmeyi iptal et",
    resume: "Yine de indir",
    resumed: "İndirme devam ediyor. Dosyayı açmadan önce bir kez daha düşün.",
    cancelled: "İndirme iptal edildi.",
    removed: "Dosya zaten inmişti; silindi.",
    tooLate: "Dosya zaten inmiş. Açmadan sil.",
  },
};

const params = new URLSearchParams(location.search);
const kind = params.get("kind") ?? "danger";
const host = params.get("host") ?? "";
const target = params.get("url") ?? "";
// Only continue to the page that was stopped, never to another address put in the link.
const canContinue = /^https?:/i.test(target) && extractHost(target) === host;

async function goBack() {
  if (history.length > 1) {
    history.back();
    return;
  }
  const tab = await browser.tabs.getCurrent();
  if (tab?.id !== undefined) await browser.tabs.remove(tab.id);
}

function useVerdict(name: string): Verdict | null | undefined {
  const [verdict, setVerdict] = useState<Verdict | null | undefined>(undefined);
  useEffect(() => {
    if (name) void ask("verdict", { host: name }).then(setVerdict);
    else setVerdict(null);
  }, [name]);
  return verdict;
}

function Brand({ text }: { text: string }) {
  return (
    <header className="page-brand">
      <Logo />
      <span>{text}</span>
    </header>
  );
}

function DangerPage() {
  const c = useContent();
  const t = TEXT[useLang()];
  const verdict = useVerdict(host);
  const [reporting, setReporting] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), [verdict]);
  if (verdict === undefined) return null;

  const fallback: ResultModel = { domain: host, level: "high", score: 90, reasons: [], category: null };
  const model: ResultModel = verdict ? { ...verdict, domain: host } : fallback;
  if (kind === "tech_support" && model.category?.id !== "tech_support") {
    model.category = { id: "tech_support", label: c.categoryNotice.tech_support.title, confidence: "high", reasons: [] };
  }

  return (
    <>
      <Brand text={kind === "tech_support" ? t.stoppedScam : t.stopped} />
      <ResultView
        result={model}
        heading="h1"
        titleRef={title}
        showDetails={Boolean(verdict?.details)}
        lead={
          <button type="button" className="hg-btn hg-btn--primary hg-btn--lg" onClick={() => void goBack()}>
            <IconBack aria-hidden="true" />
            {t.back}
          </button>
        }
        actions={
          <button type="button" className="hg-btn hg-btn--secondary" aria-expanded={reporting} onClick={() => setReporting(!reporting)}>
            <IconFlag aria-hidden="true" />
            {t.falseAlarm}
          </button>
        }
      />
      {reporting && (
        <div className="hg-card">
          <h2 className="hg-subtitle">{t.report}</h2>
          <ReportForm
            domain={host}
            initial="false_positive"
            onSubmit={async (category, note) => {
              const { ok } = await ask("report", { domain: host, category, note });
              if (!ok) throw new Error("report failed");
            }}
          />
        </div>
      )}
      {canContinue && kind !== "tech_support" && (
        <p className="continue">
          {t.continue[0]}
          <button
            type="button"
            className="hg-link-btn"
            onClick={async () => {
              await ask("proceed", { host });
              location.replace(target);
            }}
          >
            {t.continue[1]}
          </button>
          {t.continue[2]}
        </p>
      )}
    </>
  );
}

function FamilyLock() {
  const c = useContent();
  const t = TEXT[useLang()];
  const verdict = useVerdict(host);
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);
  const category = verdict?.category;

  async function unlock(e: FormEvent) {
    e.preventDefault();
    const { ok } = await ask("family-unlock", { host, pin });
    setWrong(!ok);
    if (ok && canContinue) location.replace(target);
  }

  return (
    <>
      <Brand text={t.familyBrand} />
      <section className="hg-result">
        <div className="hg-status tone-brand">
          <IconFamily className="hg-status__icon" aria-hidden="true" />
          <h1 className="hg-status__title">{t.familyTitle}</h1>
          <p className="hg-status__domain">{host}</p>
          <p className="hg-status__meaning">{t.familyText(category ? c.categoryNotice[category.id].title : null)}</p>
        </div>
        <div className="hg-result__body">
          {category?.id === "gambling" && <CategoryCallout category={category} />}
          <form className="pin-form" onSubmit={unlock}>
            <label className="hg-label" htmlFor="pin">
              {t.pinLabel}
            </label>
            <div className="pin-form__row">
              <input
                id="pin"
                className="hg-input mono"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                aria-invalid={wrong}
                aria-describedby={wrong ? "pin-error" : undefined}
              />
              <button className="hg-btn hg-btn--secondary" type="submit" disabled={pin.length < 4}>
                <IconLock aria-hidden="true" />
                {t.unlock}
              </button>
            </div>
            {wrong && (
              <p id="pin-error" className="hg-error" role="alert">
                <IconReasonDanger aria-hidden="true" />
                {t.wrongPin}
              </p>
            )}
          </form>
          <div className="hg-actions">
            <button type="button" className="hg-btn hg-btn--primary hg-btn--lg" onClick={() => void goBack()}>
              <IconBack aria-hidden="true" />
              {t.back}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function DownloadWarning() {
  const t = TEXT[useLang()];
  const id = Number(params.get("id"));
  const file = params.get("file") ?? "";
  const verdict = useVerdict(host);
  const [done, setDone] = useState<string | null>(null);

  async function act(action: "cancel" | "resume") {
    const { ok } = await ask("download-action", { id, action });
    if (action === "resume") setDone(t.resumed);
    else if (ok) setDone(t.cancelled);
    else {
      // Too late to cancel: the file is already on the disk.
      const removed = await ask("download-action", { id, action: "remove" });
      setDone(removed.ok ? t.removed : t.tooLate);
    }
  }

  return (
    <>
      <Brand text={t.downloadBrand} />
      <section className="hg-result">
        <div className="hg-status tone-caution">
          <IconDownload className="hg-status__icon" aria-hidden="true" />
          <h1 className="hg-status__title">{t.downloadTitle}</h1>
          <p className="hg-status__domain">{file}</p>
          <p className="hg-status__meaning">{host ? t.from(host) : t.fromUnknown}</p>
        </div>
        <div className="hg-result__body">
          <p>{file.endsWith(".apk") ? t.apk : t.exe}</p>
          {verdict && verdict.reasons.length > 0 && (
            <div>
              <h2 className="hg-subtitle">{t.aboutSite}</h2>
              <ReasonList reasons={verdict.reasons.slice(0, 4)} />
            </div>
          )}
          {done ? (
            <p className="hg-note tone-safe" role="status">
              <IconReasonSafe aria-hidden="true" />
              {done}
            </p>
          ) : (
            <div className="hg-actions">
              <button type="button" className="hg-btn hg-btn--primary hg-btn--lg" onClick={() => void act("cancel")}>
                {t.cancel}
              </button>
              <button type="button" className="hg-btn hg-btn--secondary" onClick={() => void act("resume")}>
                {t.resume}
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function App() {
  const t = TEXT[useLang()];
  useEffect(() => {
    document.title = t.title;
  }, [t.title]);
  return (
    <main className="warning-page">
      {kind === "download" ? <DownloadWarning /> : kind === "family" ? <FamilyLock /> : <DangerPage />}
    </main>
  );
}
