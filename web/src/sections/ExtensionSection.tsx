import { useLang } from "@shared/ui/i18n";
import {
  IconBell,
  IconCasino,
  IconDanger,
  IconDownload,
  IconExtension,
  IconFamily,
  IconForm,
  IconLink,
  IconMail,
  IconVirus,
} from "@shared/ui/icons";
import { LogoMark } from "@shared/ui/Logo";
import { StatusBand } from "@shared/ui/ResultView";

import { Reveal } from "./Reveal";

const ICONS = [IconDanger, IconForm, IconDownload, IconLink, IconMail, IconVirus, IconCasino, IconFamily, IconBell];

const TEXT = {
  en: {
    eyebrow: "Browser extension",
    title: "Stops dangerous sites before you open them",
    lead: "The HookGuard extension works quietly in Chrome, Edge or Firefox on your computer. When you click a link it checks the site first; if it is dangerous, it warns you before the page opens.",
    note: "Only the domain of the sites you open is checked; well-known sites are never sent anywhere.",
    cta: "Add to Chrome",
    stopped: "HookGuard stopped this page before it opened",
    back: "Back to safety",
    sample: "Example view",
    sampleLabel: "Example view: the extension's warning screen, shown before a dangerous site opens",
    features: [
      ["Stops dangerous sites", "If you try to open a known scam site, a red warning appears before the page loads."],
      ["Form protection", "Warns you the moment you start typing a password, card number or ID number on a suspicious site. What you type is never sent anywhere."],
      ["App and file download warning", "If a suspicious site starts downloading an .apk or .exe, it pauses the download and asks you. Against fake bank and parcel apps."],
      ["Short link preview", "Hover over a shortened link such as bit.ly to see where it really goes, and how that site looks, before you click."],
      ["Link badges in your email", "Adds a small green, orange or red badge next to links in Gmail, Outlook and WhatsApp Web."],
      ["Against fake virus warnings", "Recognises fake tech-support pages that go full screen, sound an alarm and tell you to “call this number now”."],
      ["Illegal betting protection", "Recognises unlicensed betting sites that keep changing address, and leaves legal ones alone. Shows Yeşilay's helpline 115 for support."],
      ["Family mode", "Lock betting and adult sites with a PIN. For your child's computer."],
      ["Weekly summary", "Every week a short notification tells you how many sites were checked and how many dangers were stopped."],
    ],
    installTitle: "How do I add the extension?",
    installLead: "The extension is not in the Chrome Web Store yet. For now you can build it from the source code and add it in developer mode:",
    install: [
      ["Build the extension by following the instructions on the project's ", "GitHub page", "."],
      ["In Chrome, type chrome://extensions in the address bar and turn on “Developer mode” at the top right.", "", ""],
      ["Click “Load unpacked” and choose the built folder.", "", ""],
    ],
  },
  tr: {
    eyebrow: "Tarayıcı eklentisi",
    title: "Tehlikeli siteleri sen açmadan durdurur",
    lead: "HookGuard eklentisi bilgisayarındaki Chrome, Edge ya da Firefox'ta sessizce çalışır. Bir linke tıkladığında siteyi önce kontrol eder; tehlikeliyse sayfa açılmadan seni uyarır.",
    note: "Ziyaret ettiğin sitelerin yalnızca alan adı kontrol edilir; tanınmış sitelerde sunucuya hiç sorulmaz.",
    cta: "Chrome'a ekle",
    stopped: "HookGuard bu sayfayı açılmadan durdurdu",
    back: "Güvenli sayfaya dön",
    sample: "Örnek görünüm",
    sampleLabel: "Örnek görünüm: eklentinin tehlikeli bir siteyi açılmadan durdurduğu uyarı ekranı",
    features: [
      ["Tehlikeli siteleri açılmadan durdurur", "Bilinen dolandırıcılık sitelerine girmeye çalışırsan sayfa açılmadan kırmızı bir uyarı gösterir."],
      ["Form koruması", "Şüpheli bir sitede şifre, kart numarası ya da TC kimlik numarası yazmaya başladığın anda seni uyarır. Yazdıkların hiçbir yere gönderilmez."],
      ["Uygulama ve dosya indirme uyarısı", "Şüpheli bir siteden .apk ya da .exe indirilmeye başlarsa indirmeyi durdurup sana sorar. Sahte banka ve kargo uygulamalarına karşı."],
      ["Kısa link açıcı", "bit.ly gibi kısaltılmış bir linkin üstüne geldiğinde, tıklamadan önce asıl nereye gittiğini ve sonucunu gösterir."],
      ["E-postada link rozetleri", "Gmail, Outlook ve WhatsApp Web'deki linklerin yanına yeşil, turuncu ya da kırmızı küçük bir rozet ekler."],
      ["Sahte virüs uyarılarına karşı", "Tam ekran açılan, alarm çalan, “hemen bu numarayı arayın” diyen sahte teknik destek sayfalarını tanır."],
      ["Yasadışı bahis koruması", "Adres değiştirip duran izinsiz bahis sitelerini tanır; yasal sitelere dokunmaz. Destek için Yeşilay 115'i gösterir."],
      ["Aile modu", "Bahis ve yetişkin içerikli siteleri bir PIN ile kilitleyebilirsin. Çocuğunun bilgisayarı için."],
      ["Haftalık özet", "Her hafta kaç siteyi kontrol ettiğini ve seni kaç tehlikeden koruduğunu kısa bir bildirimle söyler."],
    ],
    installTitle: "Eklentiyi nasıl eklerim?",
    installLead: "Eklenti Chrome Web Mağazası'na henüz gelmedi. Şimdilik kaynak koddan derleyip “geliştirici modu” ile ekleyebilirsin:",
    install: [
      ["Projenin ", "GitHub sayfasındaki", " talimatla eklentiyi derle."],
      ["Chrome'da adres çubuğuna chrome://extensions yaz ve sağ üstten “Geliştirici modu”nu aç.", "", ""],
      ["“Paketlenmemiş öğe yükle”ye bas ve derlenen klasörü seç.", "", ""],
    ],
  },
};

const MOCK = { domain: "ptt-kargo-odeme.example", level: "high" as const, score: 92, reasons: [], category: null };

export function ExtensionSection() {
  const t = TEXT[useLang()];
  return (
    <section className="section section--tinted" id="extension" aria-labelledby="ext-title">
      <div className="hg-container">
        <div className="ext-hero">
          <Reveal className="ext-hero__copy">
            <span className="hg-eyebrow">
              <IconExtension aria-hidden="true" />
              {t.eyebrow}
            </span>
            <h2 id="ext-title">{t.title}</h2>
            <p>{t.lead}</p>
            <p className="hg-note">
              <IconExtension aria-hidden="true" />
              {t.note}
            </p>
            <div className="hg-actions">
              <a className="hg-btn hg-btn--primary hg-btn--lg" href="#install">
                <IconExtension aria-hidden="true" />
                {t.cta}
              </a>
            </div>
          </Reveal>
          <Reveal className="mockup hg-glass hg-gradient-edge" delay={0.1}>
            <div className="mockup__bar" aria-hidden="true">
              <span className="mockup__dots">
                <i />
                <i />
                <i />
              </span>
              <span className="mockup__url mono">ptt-kargo-odeme.example/track</span>
            </div>
            <div className="mockup__page" role="img" aria-label={t.sampleLabel}>
              <div className="mockup__brand">
                <LogoMark className="mockup__logo" />
                <span>{t.stopped}</span>
              </div>
              <div className="hg-result mockup__card" aria-hidden="true">
                <StatusBand result={MOCK} level="high" as="h2" />
              </div>
              <div className="mockup__actions" aria-hidden="true">
                <span className="hg-btn hg-btn--primary">{t.back}</span>
              </div>
            </div>
            <p className="mockup__caption">{t.sample}</p>
          </Reveal>
        </div>

        <ul className="feature-grid">
          {t.features.map(([title, text], i) => {
            const Icon = ICONS[i];
            return (
              <Reveal as="li" key={title} className="hg-card feature-card" delay={(i % 3) * 0.06}>
                <span className="hg-icon-tile">
                  <Icon aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            );
          })}
        </ul>

        <Reveal className="hg-card install">
          <h3 id="install">{t.installTitle}</h3>
          <p>{t.installLead}</p>
          <ol className="hg-steps tone-brand">
            {t.install.map(([before, link, after]) => (
              <li key={before}>
                <span>
                  {before}
                  {link && <a href="https://github.com/DuranOzcelik/hookguard">{link}</a>}
                  {after}
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
