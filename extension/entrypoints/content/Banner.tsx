import { useState } from "react";

import { STATUS_TONE } from "@shared/content";
import type { Level } from "@shared/hookguard";
import { useContent, useLang } from "@shared/ui/i18n";
import { IconCaution, IconClose, IconDanger, IconPhone } from "@shared/ui/icons";
import type { Verdict } from "@/utils/verdicts";

const TEXT = {
  en: {
    advice: {
      high: "You opened it despite the warning: enter nothing and close the page.",
      medium: "Check the address before you enter a password, card details or ID number.",
    },
    dangerous: "This site is dangerous",
    why: "Why?",
    hide: "Hide",
    leave: "Leave the page",
    close: "Close the warning",
  },
  tr: {
    advice: {
      high: "Uyarıya rağmen açtın: hiçbir bilgi girme, sayfayı kapat.",
      medium: "Şifre, kart ya da TC kimlik bilgisi girmeden önce adresi kontrol et.",
    },
    dangerous: "Bu site tehlikeli",
    why: "Neden?",
    hide: "Gizle",
    leave: "Sayfadan çık",
    close: "Uyarıyı kapat",
  },
};

/** The strip at the top of a medium-risk page (orange) or a high-risk page opened anyway (red). */
export function Banner({
  verdict,
  level,
  onLeave,
  onClose,
}: {
  verdict: Verdict;
  level: Exclude<Level, "low">;
  onLeave: () => void;
  onClose: () => void;
}) {
  const c = useContent();
  const t = TEXT[useLang()];
  const [open, setOpen] = useState(false);
  const category = verdict.category;
  const title = category ? c.categoryNotice[category.id].title : level === "high" ? t.dangerous : c.status.medium.title;
  const reasons = [...(category?.reasons ?? []), ...verdict.reasons.map((r) => r.text)].slice(0, 4);
  const Icon = level === "high" ? IconDanger : IconCaution;
  const support = category ? c.categoryNotice[category.id].support : undefined;

  return (
    <div className={`hg-banner tone-${STATUS_TONE[level]}`} role="alert">
      <div className="hg-banner__bar">
        <Icon className="hg-banner__icon" aria-hidden="true" />
        <p className="hg-banner__text">
          <strong>HookGuard: {title}.</strong> {t.advice[level]}
        </p>
        <div className="hg-banner__actions">
          <button type="button" className="hg-banner__btn" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? t.hide : t.why}
          </button>
          <button type="button" className="hg-banner__btn hg-banner__btn--solid" onClick={onLeave}>
            {t.leave}
          </button>
          <button type="button" className="hg-banner__close" aria-label={t.close} onClick={onClose}>
            <IconClose aria-hidden="true" />
          </button>
        </div>
      </div>
      {open && (
        <div className="hg-banner__more">
          <ul>
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {support && (
            <a className="hg-banner__support" href={support.href}>
              <IconPhone aria-hidden="true" />
              {support.label}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
