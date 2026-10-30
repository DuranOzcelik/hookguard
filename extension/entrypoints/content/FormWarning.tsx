import { useEffect, useRef } from "react";

import type { Content } from "@shared/content";
import { useContent, useLang } from "@shared/ui/i18n";
import { IconForm } from "@shared/ui/icons";
import type { SensitiveKind } from "@/utils/messages";
import { effectiveLevel, type Verdict } from "@/utils/verdicts";

const TEXT = {
  en: {
    title: (what: string) => `Stop! You are about to type ${what} into this site.`,
    what: { password: "your password", card: "your card number", tckn: "your ID number" },
    young: (days: number) => `This is not a well-known site, and it was set up only ${days} days ago.`,
    unknown: "This is not a well-known site, and we do not know how long it has existed.",
    moment: "This is exactly the moment scammers steal details. If you are not sure, type the organisation's address yourself instead of using a link.",
    privacy: "What you typed was not sent anywhere; HookGuard only checked, on your device, what kind of information it is.",
    leave: "Leave the page",
    trust: "I trust this site",
  },
  tr: {
    title: (what: string) => `Dur! Bu siteye ${what} yazmak üzeresin.`,
    what: { password: "şifreni", card: "kart numaranı", tckn: "TC kimlik numaranı" },
    young: (days: number) => `Bu site tanınmış bir site değil ve yalnızca ${days} gün önce açılmış.`,
    unknown: "Bu site tanınmış bir site değil ve ne zamandır var olduğu bilinmiyor.",
    moment: "Dolandırıcılar bilgileri tam bu anda çalar. Emin değilsen siteye linkten değil, kurumun adresini kendin yazarak gir.",
    privacy: "Yazdığın bilgi hiçbir yere gönderilmedi; HookGuard yalnızca ne tür bir bilgi olduğuna cihazında baktı.",
    leave: "Sayfadan çık",
    trust: "Bu siteye güveniyorum",
  },
};

function why(c: Content, t: (typeof TEXT)["en"], verdict: Verdict | null): string {
  if (verdict && effectiveLevel(verdict) !== "low") {
    return `${c.status[effectiveLevel(verdict)].short} ${verdict.reasons[0]?.text ?? ""}`.trim();
  }
  return verdict?.ageDays != null ? t.young(verdict.ageDays) : t.unknown;
}

/** Shown the moment a password, card number or identity number starts going into a suspect site. */
export function FormWarning({
  kind,
  host,
  verdict,
  onLeave,
  onTrust,
}: {
  kind: SensitiveKind;
  host: string;
  verdict: Verdict | null;
  onLeave: () => void;
  onTrust: () => void;
}) {
  const c = useContent();
  const t = TEXT[useLang()];
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  return (
    <div className="hg-modal" role="alertdialog" aria-modal="true" aria-labelledby="hg-form-title" aria-describedby="hg-form-text">
      <div className="hg-modal__card tone-caution">
        <IconForm className="hg-modal__icon" aria-hidden="true" />
        <h2 id="hg-form-title" className="hg-modal__title">
          {t.title(t.what[kind])}
        </h2>
        <p className="hg-modal__host">{host}</p>
        <div id="hg-form-text" className="hg-modal__text">
          <p>{why(c, t, verdict)}</p>
          <p>{t.moment}</p>
          <p className="hg-modal__privacy">{t.privacy}</p>
        </div>
        <div className="hg-modal__actions">
          <button ref={first} type="button" className="hg-btn hg-btn--primary hg-btn--lg" onClick={onLeave}>
            {t.leave}
          </button>
          <button type="button" className="hg-btn hg-btn--secondary" onClick={onTrust}>
            {t.trust}
          </button>
        </div>
      </div>
    </div>
  );
}
