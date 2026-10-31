import { useContent, useLang } from "@shared/ui/i18n";
import { Logo } from "@shared/ui/Logo";

import { ON_DEVICE } from "../checks";

const REPO = "https://github.com/DuranOzcelik/hookguard";

const TEXT = {
  en: {
    tagline: "Check before you click.",
    privacy: "Privacy",
    privacyText: ON_DEVICE
      ? "Links are checked in your browser and never sent anywhere. We use no cookies or ad tracking."
      : "Only the domain is sent for a check; never the full link or your personal details. The addresses you check are not stored. We use no cookies or ad tracking.",
    contact: "Contact",
    contactText: ["For questions, ideas or to report a wrong result, write to us on our ", "GitHub page", "."],
    licenses: "Licenses",
    disclaimer: "Disclaimer",
  },
  tr: {
    tagline: "Tıklamadan önce emin ol.",
    privacy: "Gizlilik",
    privacyText: ON_DEVICE
      ? "Linkler tarayıcının içinde kontrol edilir ve hiçbir yere gönderilmez. Çerez ya da reklam takibi kullanmayız."
      : "Kontrol için yalnızca alan adı gönderilir; linkin tamamı ve kişisel bilgilerin gönderilmez. Kontrol ettiğin adresler kaydedilmez. Çerez ya da reklam takibi kullanmayız.",
    contact: "İletişim",
    contactText: ["Soru, öneri ya da yanlış bir sonucu bildirmek için ", "GitHub sayfamıza", " yazabilirsin."],
    licenses: "Lisanslar",
    disclaimer: "Sorumluluk reddi",
  },
};

export function Footer() {
  const t = TEXT[useLang()];
  const c = useContent();
  return (
    <footer className="site-footer">
      <div className="hg-container site-footer__grid">
        <div className="site-footer__brand">
          <Logo />
          <p>{t.tagline}</p>
        </div>
        <div>
          <h2>{t.privacy}</h2>
          <p>{t.privacyText}</p>
        </div>
        <div>
          <h2>{t.contact}</h2>
          <p>
            {t.contactText[0]}
            <a href={`${REPO}/issues`}>{t.contactText[1]}</a>
            {t.contactText[2]}
          </p>
          {/* The icon set's CC BY licence asks for attribution; it lives in the notices file. */}
          <p>
            <a href={`${REPO}/blob/main/THIRD_PARTY_NOTICES.md`}>{t.licenses}</a>
          </p>
        </div>
        <div>
          <h2>{t.disclaimer}</h2>
          <p>{c.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
