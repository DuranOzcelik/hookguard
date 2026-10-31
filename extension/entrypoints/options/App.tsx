import { useEffect, useState, type FormEvent } from "react";

import { PALETTE_NAMES, PALETTES, type Lang, type Palette } from "@shared/content";
import { useLang } from "@shared/ui/i18n";
import { IconFamily, IconLock, IconReasonDanger, IconReasonSafe } from "@shared/ui/icons";
import { Logo } from "@shared/ui/Logo";
import { ask, type SettingsPatch, type Status } from "@/utils/messages";
import type { FamilyCategory, Settings } from "@/utils/settings";

type Toggle = Exclude<keyof Settings, "apiBase" | "family" | "lang" | "palette">;
const TOGGLE_KEYS: Toggle[] = [
  "formProtection",
  "downloadWarning",
  "shortLinkPreview",
  "linkBadges",
  "techSupport",
  "categoryProtection",
  "weeklySummary",
];

const TEXT = {
  en: {
    title: "Settings",
    appearance: "Language and colour",
    language: "Language",
    color: "Colour",
    toggles: {
      formProtection: ["Form protection", "Warns you when you start typing a password, card number or ID number on a suspicious or brand-new site. What you type is never sent anywhere."],
      downloadWarning: ["Download warning", "Stops files such as .apk and .exe from suspicious sites before they download, and asks you."],
      shortLinkPreview: ["Short link preview", "Shows where links such as bit.ly lead when you hover over them. This sends one request to the link service; the destination site is never contacted."],
      linkBadges: ["Link badges in your email", "Adds a green, orange or red badge next to links in Gmail, Outlook and WhatsApp Web."],
      techSupport: ["Fake virus warnings", "Stops fake tech-support pages that say “a virus was found on your computer, call now”."],
      categoryProtection: ["Betting, fake investment and fake shop warnings", "Stops illegal betting sites, and warns on fake investment sites and suspicious shops without an ETBİS registration."],
      weeklySummary: ["Weekly summary", "A short notification each week with how many sites were checked and how many dangers were stopped."],
    } as Record<Toggle, [string, string]>,
    protections: "Protections",
    alwaysOn: "Blocking known scam sites is always on.",
    familyTitle: "Family mode",
    familyText: "Sites of the types you choose are locked with a PIN. For your child's computer. Note: removing the extension removes the lock too; for young children, use it together with your computer's child account settings.",
    lockWhat: "Sites to lock",
    choices: { gambling: "Betting and gambling sites", adult: "Adult sites" } as Record<FamilyCategory, string>,
    newPin: "New PIN (4–8 digits)",
    newPin2: "Type the PIN again",
    enable: "Turn on family mode",
    disable: "Turn off family mode",
    parentPin: "Parent PIN",
    pinNeeded: "Family mode is on: enter the parent PIN to change settings.",
    saved: "Saved.",
    familyOn: "Family mode is on.",
    familyOff: "Family mode is off.",
    pinWrong: "Changing this needs the parent PIN, or the PIN is wrong.",
    pinShape: "The PIN must be 4 to 8 digits.",
    pinDiffer: "The two PINs are not the same.",
    server: "Lists and checks",
    lists: (bad: string, good: string, when: string) => `Local list: ${bad} known scam addresses, ${good} well-known sites.${when ? ` Updated ${when}.` : ""}`,
    address: "Your own HookGuard server (optional)",
    addressHint: "Leave it empty to check on this device. With your own server, the domains of the sites you open are sent to it, which adds how long a site has existed.",
    addressPlaceholder: "Empty: on this device",
    save: "Save",
    refresh: "Update the list now",
    privacy: "Privacy",
    privacyText: "HookGuard checks the sites you open on this device. The sites you visit, what you type into forms, page content and the weekly counts never leave it. Every few hours it downloads the updated lists from the HookGuard site.",
  },
  tr: {
    title: "Ayarlar",
    appearance: "Dil ve renk",
    language: "Dil",
    color: "Renk",
    toggles: {
      formProtection: ["Form koruması", "Şüpheli ya da yeni açılmış bir sitede şifre, kart veya TC kimlik numarası yazmaya başladığında uyarır. Yazdıkların hiçbir yere gönderilmez."],
      downloadWarning: ["İndirme uyarısı", ".apk ve .exe gibi dosyaları şüpheli sitelerden indirmeden önce durdurur ve sana sorar."],
      shortLinkPreview: ["Kısa link açıcı", "bit.ly gibi linklerin üstüne gelince nereye gittiğini gösterir. Bunun için kısa link servisine bir istek gider; linkin gittiği siteye gidilmez."],
      linkBadges: ["E-postada link rozetleri", "Gmail, Outlook ve WhatsApp Web'deki linklerin yanına yeşil, turuncu ya da kırmızı rozet ekler."],
      techSupport: ["Sahte virüs uyarıları", "“Bilgisayarınızda virüs bulundu, hemen arayın” diyen sahte teknik destek sayfalarını durdurur."],
      categoryProtection: ["Bahis, sahte yatırım ve sahte alışveriş uyarıları", "Yasadışı bahis sitelerini durdurur; sahte yatırım ve ETBİS kaydı olmayan şüpheli alışveriş sitelerinde uyarır."],
      weeklySummary: ["Haftalık özet", "Her hafta kaç siteyi kontrol ettiğini ve seni kaç tehlikeden koruduğunu kısa bir bildirimle söyler."],
    } as Record<Toggle, [string, string]>,
    protections: "Korumalar",
    alwaysOn: "Bilinen dolandırıcılık sitelerinin engellenmesi her zaman açıktır.",
    familyTitle: "Aile modu",
    familyText: "Seçtiğin türdeki siteler bir PIN ile kilitlenir. Çocuğunun kullandığı bilgisayar için. Not: eklenti kaldırılırsa kilit de kalkar; küçük çocuklar için bilgisayarın çocuk hesabı ayarlarıyla birlikte kullan.",
    lockWhat: "Kilitlenecek siteler",
    choices: { gambling: "Bahis ve kumar siteleri", adult: "Yetişkin içerikli siteler" } as Record<FamilyCategory, string>,
    newPin: "Yeni PIN (4–8 rakam)",
    newPin2: "PIN'i tekrar yaz",
    enable: "Aile modunu aç",
    disable: "Aile modunu kapat",
    parentPin: "Ebeveyn PIN'i",
    pinNeeded: "Aile modu açık: ayarları değiştirmek için ebeveyn PIN'ini yaz.",
    saved: "Kaydedildi.",
    familyOn: "Aile modu açıldı.",
    familyOff: "Aile modu kapatıldı.",
    pinWrong: "Değişiklik için ebeveyn PIN'i gerekli ya da PIN yanlış.",
    pinShape: "PIN 4 ile 8 rakam arasında olmalı.",
    pinDiffer: "İki PIN aynı değil.",
    server: "Listeler ve kontrol",
    lists: (bad: string, good: string, when: string) => `Yerel liste: ${bad} bilinen dolandırıcılık adresi, ${good} tanınmış site.${when ? ` Son güncelleme: ${when}.` : ""}`,
    address: "Kendi HookGuard sunucun (isteğe bağlı)",
    addressHint: "Bu cihazda kontrol etmek için boş bırak. Kendi sunucunu yazarsan açtığın sitelerin alan adları oraya gönderilir; bu, sitenin ne zamandır var olduğunu da ekler.",
    addressPlaceholder: "Boş: bu cihazda",
    save: "Kaydet",
    refresh: "Listeyi şimdi güncelle",
    privacy: "Gizlilik",
    privacyText: "HookGuard açtığın siteleri bu cihazda kontrol eder. Ziyaret ettiğin siteler, formlara yazdıkların, sayfaların içeriği ve haftalık sayılar bu cihazdan çıkmaz. Güncel listeleri birkaç saatte bir HookGuard sitesinden indirir.",
  },
};

export default function App() {
  const lang = useLang();
  const t = TEXT[lang];
  const locale = lang === "tr" ? "tr-TR" : "en-GB";
  const [status, setStatus] = useState<Status | null>(null);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const [blocked, setBlocked] = useState<FamilyCategory[]>(["gambling", "adult"]);
  const [api, setApi] = useState("");

  useEffect(() => {
    void ask("status").then((s) => {
      setStatus(s);
      setApi(s.apiBase);
      setBlocked(s.settings.family.blocked);
    });
  }, []);

  if (!status) return null;
  const settings = status.settings;
  const family = settings.family.enabled;

  async function save(patch: SettingsPatch, extra: { newPin?: string } = {}, done = t.saved) {
    const result = await ask("save-settings", { patch, pin: pin || undefined, ...extra });
    setStatus(result.status);
    setMessage(result.ok ? { ok: true, text: done } : { ok: false, text: t.pinWrong });
    return result.ok;
  }

  // Language and colour apply to the extension's pages: reload this one to show the choice.
  async function savePresentation(patch: { lang?: Lang; palette?: Palette }) {
    if (await save(patch)) location.reload();
  }

  async function enableFamily(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(newPin)) return setMessage({ ok: false, text: t.pinShape });
    if (newPin !== newPin2) return setMessage({ ok: false, text: t.pinDiffer });
    if (await save({ family: { enabled: true, blocked } }, { newPin }, t.familyOn)) {
      setNewPin("");
      setNewPin2("");
    }
  }

  const n = (x: number) => x.toLocaleString(locale);

  return (
    <main className="options-page">
      <header className="page-brand">
        <Logo />
      </header>
      <h1>{t.title}</h1>

      {message && (
        <p className={message.ok ? "hg-note tone-safe" : "hg-error"} role="status">
          {message.ok ? <IconReasonSafe aria-hidden="true" /> : <IconReasonDanger aria-hidden="true" />}
          {message.text}
        </p>
      )}

      {family && (
        <div className="hg-card tone-brand">
          <p className="hg-note">
            <IconLock aria-hidden="true" />
            {t.pinNeeded}
          </p>
          <label className="hg-label" htmlFor="parent-pin">
            {t.parentPin}
          </label>
          <input
            id="parent-pin"
            className="hg-input mono"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      )}

      <section className="hg-card" aria-labelledby="appearance">
        <h2 id="appearance">{t.appearance}</h2>
        <p className="hg-label">{t.language}</p>
        <div className="hg-segmented" role="radiogroup" aria-label={t.language}>
          {(["en", "tr"] as Lang[]).map((l) => (
            <button key={l} type="button" role="radio" lang={l} aria-checked={settings.lang === l} onClick={() => void savePresentation({ lang: l })}>
              {l === "en" ? "English" : "Türkçe"}
            </button>
          ))}
        </div>
        <p className="hg-label">{t.color}</p>
        <div className="hg-swatches" role="radiogroup" aria-label={t.color}>
          {PALETTES.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              className="hg-swatch"
              data-palette-preview={p}
              aria-checked={settings.palette === p}
              aria-label={PALETTE_NAMES[lang][p]}
              title={PALETTE_NAMES[lang][p]}
              onClick={() => void savePresentation({ palette: p })}
            >
              <span />
            </button>
          ))}
        </div>
      </section>

      <section className="hg-card" aria-labelledby="protections">
        <h2 id="protections">{t.protections}</h2>
        <p className="fine">{t.alwaysOn}</p>
        <div>
          {TOGGLE_KEYS.map((key) => (
            <label key={key} className="hg-switch">
              <span className="hg-switch__title">{t.toggles[key][0]}</span>
              <span className="hg-switch__desc">{t.toggles[key][1]}</span>
              <input type="checkbox" role="switch" checked={settings[key]} onChange={(e) => void save({ [key]: e.target.checked })} />
            </label>
          ))}
        </div>
      </section>

      <section className="hg-card" aria-labelledby="family-title">
        <h2 id="family-title">
          <IconFamily aria-hidden="true" className="title-icon" /> {t.familyTitle}
        </h2>
        <p>{t.familyText}</p>
        <fieldset className="choice-row" disabled={family}>
          <legend className="hg-label">{t.lockWhat}</legend>
          {(["gambling", "adult"] as FamilyCategory[]).map((value) => (
            <label key={value} className="choice">
              <input
                type="checkbox"
                checked={blocked.includes(value)}
                onChange={(e) => setBlocked(e.target.checked ? [...blocked, value] : blocked.filter((b) => b !== value))}
              />
              {t.choices[value]}
            </label>
          ))}
        </fieldset>
        {family ? (
          <div className="hg-actions">
            <button type="button" className="hg-btn hg-btn--secondary" onClick={() => void save({ family: { enabled: false } }, {}, t.familyOff)}>
              {t.disable}
            </button>
          </div>
        ) : (
          <form className="hg-stack" onSubmit={enableFamily}>
            <div>
              <label className="hg-label" htmlFor="new-pin">
                {t.newPin}
              </label>
              <input id="new-pin" className="hg-input mono" type="password" inputMode="numeric" autoComplete="new-password" maxLength={8}
                value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div>
              <label className="hg-label" htmlFor="new-pin-2">
                {t.newPin2}
              </label>
              <input id="new-pin-2" className="hg-input mono" type="password" inputMode="numeric" autoComplete="new-password" maxLength={8}
                value={newPin2} onChange={(e) => setNewPin2(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="hg-actions">
              <button type="submit" className="hg-btn hg-btn--primary">
                <IconLock aria-hidden="true" />
                {t.enable}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="hg-card" aria-labelledby="server-title">
        <h2 id="server-title">{t.server}</h2>
        <p className="fine">
          {t.lists(
            n(status.lists.counts.blocklist ?? 0),
            n(status.lists.counts.allowlist ?? 0),
            status.lists.checkedAt ? new Date(status.lists.checkedAt).toLocaleString(locale) : "",
          )}
        </p>
        <form
          className="pin-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save({ apiBase: api });
          }}
        >
          <label className="hg-label" htmlFor="api">
            {t.address}
          </label>
          <div className="pin-form__row">
            <input id="api" className="hg-input mono" value={api} onChange={(e) => setApi(e.target.value)} spellCheck={false}
              placeholder={t.addressPlaceholder} aria-describedby="api-hint" />
            <button type="submit" className="hg-btn hg-btn--secondary">
              {t.save}
            </button>
          </div>
          <p id="api-hint" className="fine">
            {t.addressHint}
          </p>
        </form>
        <div className="hg-actions">
          <button type="button" className="hg-btn hg-btn--secondary" onClick={() => void ask("refresh-lists").then(setStatus)}>
            {t.refresh}
          </button>
        </div>
      </section>

      <section className="hg-card" aria-labelledby="privacy-title">
        <h2 id="privacy-title">{t.privacy}</h2>
        <p>{t.privacyText}</p>
      </section>
    </main>
  );
}
