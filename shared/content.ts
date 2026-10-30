/**
 * Everything HookGuard says to people, in English (the default) and Turkish, for the web
 * page and the extension. Plain words, no technical terms (design-system/MASTER.md §10):
 * never the name of a threat list, a model, DNS or WHOIS.
 */

import type { CategoryId, CheckResult, Level, ReportCategory } from "./hookguard";

export type Lang = "en" | "tr";
export const LANGS: Lang[] = ["en", "tr"];
export const DEFAULT_LANG: Lang = "en";
export type Tone = "safe" | "caution" | "danger" | "info" | "brand";
export type Palette = "aurora" | "ocean" | "orchid" | "lagoon" | "graphite";
export const PALETTES: Palette[] = ["aurora", "ocean", "orchid", "lagoon", "graphite"];
export const PALETTE_NAMES: Record<Lang, Record<Palette, string>> = {
  en: { aurora: "Aurora", ocean: "Ocean", orchid: "Orchid", lagoon: "Lagoon", graphite: "Graphite" },
  tr: { aurora: "Aurora", ocean: "Okyanus", orchid: "Orkide", lagoon: "Lagün", graphite: "Grafit" },
};

export interface CategoryNotice {
  title: string;
  body: string;
  tone: Tone;
  support?: { title: string; text: string; label: string; href: string };
  more?: { label: string; href: string };
}

export interface Content {
  status: Record<Level, { title: string; meaning: string; short: string }>;
  whatToDo: Record<Level, string[]>;
  afterClick: { title: string; steps: string[] };
  categoryNotice: Record<CategoryId, CategoryNotice>;
  categoryMeaning: Record<CategoryId, string>;
  categorySteps: Partial<Record<CategoryId, string[]>>;
  share: { label: string; message: (domain: string, level: Level) => string };
  reportOptions: { value: ReportCategory; label: string }[];
  report: {
    title: string;
    domain: string;
    kind: string;
    note: string;
    noteHint: string;
    submit: string;
    sending: string;
    done: string;
    failed: string;
  };
  ui: {
    why: string;
    whatToDo: string;
    details: string;
    score: (n: number) => string;
    home: string;
  };
  details: {
    domain: string;
    age: string;
    opens: string;
    similarity: string;
    popularity: string;
    threatList: string;
    checked: string;
    since: (date: string) => string;
    sharedHost: (host: string) => string;
    unknown: string;
    yes: string;
    no: string;
    couldNotCheck: string;
    similarityValue: (pct: number) => string;
    notCalculated: string;
    listed: (date: string) => string;
    notListed: string;
    popular: [string, string, string, string];
  };
  months: string[];
  privacyNote: string;
  disclaimer: string;
  local: { listed: string; parentListed: (parent: string) => string; allowlisted: string };
  weekly: (s: { checked: number; warned: number; blocked: number; forms: number; downloads: number }) => string;
  locale: string;
}

const STAT = (n: number, locale: string) => n.toLocaleString(locale);

const en: Content = {
  status: {
    low: { title: "Looks safe", meaning: "We found no known warning signs at this address.", short: "No clear warning signs." },
    medium: { title: "Be careful", meaning: "This address shows signs seen on scam sites.", short: "Shows signs seen on scam sites." },
    high: { title: "Dangerous", meaning: "This address is very likely a scam site.", short: "Very likely a scam site." },
  },
  whatToDo: {
    low: [
      "Still check that the address in the address bar belongs to the site you meant to visit.",
      "If an unexpected message asked for a password or card details, type the site's address yourself instead of using the link.",
      "If something feels off, enter nothing and call the organisation on its official number.",
    ],
    medium: [
      "Compare the address letter by letter with the brand's official site.",
      "Do not enter a password, card details or ID number.",
      "If you are unsure, type the site's address yourself instead of using the link.",
      "Call the organisation that sent the message on its official number and ask.",
    ],
    high: [
      "Do not click this link or visit the site.",
      "Enter nothing: no password, card details, ID number or SMS code.",
      "Do not forward the link; delete the message.",
      "If you have business with the organisation, use its official app or type its address yourself.",
    ],
  },
  afterClick: {
    title: "If you clicked this link and entered details",
    steps: [
      "If you entered card or bank details, call your bank now (the number on the back of your card) and have the card blocked.",
      "If you entered a password, change it now, and everywhere else you use the same password.",
      "If you entered your e-Devlet password, change your e-Devlet password.",
      "If you installed an app on your phone, disconnect the phone from the internet and call your bank.",
      "If you lost money, go to the nearest police station or the public prosecutor's office.",
    ],
  },
  categoryNotice: {
    gambling: {
      title: "Illegal betting site",
      body:
        "Unlicensed betting and gambling sites are illegal in Turkey. You may never get your money back, and your card and " +
        "identity details can be misused. These sites reopen under new addresses as soon as they are blocked.",
      tone: "danger",
      support: {
        title: "Helpline",
        text: "If gambling is hurting you or someone close to you, you are not alone. Yeşilay's counselling line can help.",
        label: "Call Yeşilay 115",
        href: "tel:115",
      },
    },
    investment: {
      title: "Possible fake investment site",
      body:
        "Promises such as “5% a day” or “guaranteed returns”, and ads using celebrities' names, are signs of fraud. Before " +
        "investing, check on the Capital Markets Board (SPK) website whether the company is authorised.",
      tone: "caution",
      more: { label: "Go to the SPK website", href: "https://www.spk.gov.tr" },
    },
    shopping: {
      title: "Possible fake shop",
      body:
        "Very new shops with unrealistic discounts and no contact details are usually fake. Legal online shops in Turkey are " +
        "registered with the Ministry of Trade (ETBİS); look for the ETBİS logo at the bottom of the page. Pay on delivery " +
        "or with a secure payment method.",
      tone: "caution",
    },
    adult: {
      title: "Adult site",
      body: "This site may contain adult content. On computers children use, you can turn on the extension's Family mode.",
      tone: "info",
    },
    tech_support: {
      title: "Fake virus warning",
      body:
        "There is no virus on your computer. This page tries to scare you into calling a number or installing a program. " +
        "Do not call, install nothing and close the page.",
      tone: "danger",
    },
  },
  categoryMeaning: {
    gambling: "This may be an illegal betting site.",
    investment: "This may be a fake investment site.",
    shopping: "This may be a fake shop.",
    adult: "This site may contain adult content.",
    tech_support: "This is a fake virus warning page.",
  },
  categorySteps: {
    gambling: [
      "Do not deposit money here or enter card or ID details.",
      "Do not click links in “trial bonus” or “new login address” messages.",
      "If you have paid money in, call your bank and have your card blocked.",
    ],
    investment: [
      "Do not send money; never pay anyone who says you must pay a fee to withdraw your earnings.",
      "Check on the Capital Markets Board (SPK) website whether the company is authorised.",
      "Do not trust people who invite you into WhatsApp or Telegram groups.",
    ],
    shopping: [
      "Do not pay by bank transfer.",
      "Look for the ETBİS logo, an address and a phone number at the bottom of the page.",
      "Search for the product on a well-known shop too; if the price is unrealistic, walk away.",
    ],
    tech_support: [
      "Do not call the number on the screen.",
      "Install nothing and give no one remote access to your computer.",
      "Close the tab; if it will not close, close and reopen the browser.",
    ],
  },
  share: {
    label: "Warn the person who sent this link",
    message: (domain, level) =>
      `Warning: “${domain}” ${level === "high" ? "is dangerous, very likely a scam site" : "looks suspicious"}. ` +
      "Do not click the link or enter any details. (Checked with HookGuard.)",
  },
  reportOptions: [
    { value: "phishing", label: "Scam / fake site" },
    { value: "gambling", label: "Illegal betting" },
    { value: "investment", label: "Fake investment" },
    { value: "shopping", label: "Fake shop" },
    { value: "tech_support", label: "Fake virus warning" },
    { value: "false_positive", label: "False alarm: this site is trustworthy" },
    { value: "other", label: "Other" },
  ],
  report: {
    title: "Report a suspicious site",
    domain: "Address you are reporting:",
    kind: "What kind of site is it?",
    note: "Note (optional)",
    noteHint: "For example “came by SMS”. Do not write names, phone numbers or card details.",
    submit: "Report",
    sending: "Sending…",
    done: "Thank you. We will review your report; if it is confirmed, other people will be protected from this site too.",
    failed: "The report could not be sent. Please try again in a little while.",
  },
  ui: {
    why: "Why?",
    whatToDo: "What should you do?",
    details: "Details",
    score: (n) => `Risk score: ${n} out of 100`,
    home: "HookGuard home",
  },
  details: {
    domain: "Domain",
    age: "How long the site has existed",
    opens: "Does the site open right now?",
    similarity: "Similarity score",
    popularity: "Popularity",
    threatList: "Threat list",
    checked: "Checked at",
    since: (date) => `Since ${date}`,
    sharedHost: (host) => `On a free service (${host})`,
    unknown: "Unknown",
    yes: "Yes",
    no: "No",
    couldNotCheck: "Could not check",
    similarityValue: (pct) => `${pct}% (similarity to the names of scam sites)`,
    notCalculated: "Not calculated",
    listed: (date) => `On the list (added ${date})`,
    notListed: "Not on the list",
    popular: [
      "Among the 1,000 most visited sites in the world",
      "Among the 10,000 most visited sites in the world",
      "Among the 100,000 most visited sites in the world",
      "A little-known site",
    ],
  },
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  privacyNote: "Only the domain is sent; never the full link or your personal details.",
  disclaimer:
    "The result combines known threat lists, our AI model and the domain's technical details. No tool can give a 100% guarantee.",
  local: {
    listed: "This address is on a list of known scam sites.",
    parentListed: (parent) => `This site's main address (${parent}) is on a list of known scam sites.`,
    allowlisted: "An official or very widely visited, well-known site.",
  },
  weekly: (s) => {
    const parts = [
      s.blocked && `stopped ${s.blocked} dangerous site${s.blocked > 1 ? "s" : ""} before they opened`,
      s.warned && `warned you on ${s.warned} site${s.warned > 1 ? "s" : ""}`,
      s.forms && `warned you ${s.forms} time${s.forms > 1 ? "s" : ""} before you entered details`,
      s.downloads && `stopped ${s.downloads} suspicious download${s.downloads > 1 ? "s" : ""}`,
    ].filter(Boolean);
    const checked = `${STAT(s.checked, "en-GB")} sites checked.`;
    return parts.length ? `This week I ${parts.join(", ")}. ${checked}` : `No dangerous sites this week. ${checked}`;
  },
  locale: "en-GB",
};

const tr: Content = {
  status: {
    low: { title: "Güvenli görünüyor", meaning: "Bu adreste bilinen bir tehlike işareti bulmadık.", short: "Belirgin bir tehlike işareti yok." },
    medium: {
      title: "Dikkatli ol",
      meaning: "Bu adreste dolandırıcılık sitelerine benzeyen işaretler var.",
      short: "Dolandırıcılık sitelerine benzeyen işaretler var.",
    },
    high: { title: "Tehlikeli", meaning: "Bu adres büyük olasılıkla bir dolandırıcılık sitesi.", short: "Büyük olasılıkla bir dolandırıcılık sitesi." },
  },
  whatToDo: {
    low: [
      "Yine de adres çubuğundaki adresin gitmek istediğin siteye ait olduğuna bak.",
      "Şifre ya da kart bilgisi isteyen beklenmedik bir mesajla geldiysen siteye linkten değil, kendin yazarak gir.",
      "Bir şey tuhaf geliyorsa bilgi girme; kurumu resmi numarasından ara.",
    ],
    medium: [
      "Adresi markanın resmi sitesiyle harf harf karşılaştır.",
      "Şifre, kart veya TC kimlik bilgisi girme.",
      "Emin değilsen siteye linkten değil, kendin yazarak gir.",
      "Mesajı gönderen kurumu resmi numarasından arayıp sor.",
    ],
    high: [
      "Bu linke tıklama, siteye girme.",
      "Hiçbir bilgi girme: şifre, kart, TC kimlik ve SMS ile gelen kod dahil.",
      "Linki başkalarına iletme; mesajı sil.",
      "Kurumla bir işin varsa resmi uygulamasından ya da sitesine kendin yazarak gir.",
    ],
  },
  afterClick: {
    title: "Bu linke tıkladıysan ve bilgi girdiysen",
    steps: [
      "Kart ya da banka bilgisi girdiysen hemen bankanı ara (kartının arkasındaki numara) ve kartını kapattır.",
      "Şifre girdiysen o şifreyi hemen değiştir; aynı şifreyi kullandığın her yerde de değiştir.",
      "e-Devlet şifreni girdiysen e-Devlet şifreni değiştir.",
      "Telefonuna bir uygulama yüklediysen telefonu internetten çıkar ve bankanı ara.",
      "Para kaybettiysen en yakın karakola ya da Cumhuriyet Başsavcılığına başvur.",
    ],
  },
  categoryNotice: {
    gambling: {
      title: "Yasadışı bahis sitesi",
      body:
        "Türkiye'de izinsiz bahis ve kumar siteleri yasa dışıdır. Yatırdığın parayı geri alamayabilirsin; kart ve kimlik " +
        "bilgilerin kötüye kullanılabilir. Bu siteler kapatıldıkça adres değiştirip yeniden açılır.",
      tone: "danger",
      support: {
        title: "Destek hattı",
        text: "Kumar sana ya da bir yakınına zarar veriyorsa yalnız değilsin. Yeşilay Danışmanlık Hattı'ndan destek alabilirsin.",
        label: "Yeşilay 115'i ara",
        href: "tel:115",
      },
    },
    investment: {
      title: "Sahte yatırım sitesi olabilir",
      body:
        "“Günde %5 kazanç”, “garantili getiri” gibi vaatler ve ünlülerin adının geçtiği reklamlar dolandırıcılık işaretidir. " +
        "Yatırım yapmadan önce kuruluşun izinli olup olmadığını Sermaye Piyasası Kurulu'nun sitesinden kontrol et.",
      tone: "caution",
      more: { label: "SPK'nın sitesine git", href: "https://www.spk.gov.tr" },
    },
    shopping: {
      title: "Sahte alışveriş sitesi olabilir",
      body:
        "Çok yeni açılmış, gerçek dışı indirim yapan ve iletişim bilgisi vermeyen siteler genellikle sahtedir. Yasal alışveriş " +
        "siteleri Ticaret Bakanlığı'nın ETBİS kaydına sahiptir; sayfanın altında ETBİS logosunu ara. Ödemeyi kapıda ya da " +
        "güvenli ödeme yöntemleriyle yap.",
      tone: "caution",
    },
    adult: {
      title: "Yetişkin içerikli site",
      body: "Bu site yetişkin içerik barındırıyor olabilir. Çocukların kullandığı bilgisayarlarda eklentinin Aile modunu açabilirsin.",
      tone: "info",
    },
    tech_support: {
      title: "Sahte virüs uyarısı",
      body:
        "Bilgisayarında virüs yok. Bu sayfa seni korkutup bir numarayı aratmaya ya da bir program yükletmeye çalışıyor. " +
        "Numarayı arama, hiçbir şey yükleme, sayfayı kapat.",
      tone: "danger",
    },
  },
  categoryMeaning: {
    gambling: "Bu, yasadışı bir bahis sitesi olabilir.",
    investment: "Bu, sahte bir yatırım sitesi olabilir.",
    shopping: "Bu, sahte bir alışveriş sitesi olabilir.",
    adult: "Bu site yetişkin içerik barındırıyor olabilir.",
    tech_support: "Bu, sahte bir virüs uyarısı sayfası.",
  },
  categorySteps: {
    gambling: [
      "Bu siteye para yatırma; kart ve kimlik bilgisi girme.",
      "“Deneme bonusu” ya da “güncel giriş adresi” mesajlarındaki linklere tıklama.",
      "Para yatırdıysan bankanı ara ve kartını kapattır.",
    ],
    investment: [
      "Para gönderme; “kazancını çekmek için önce ücret öde” diyenlere hiç ödeme yapma.",
      "Kuruluşun izinli olup olmadığını Sermaye Piyasası Kurulu'nun sitesinden kontrol et.",
      "Seni WhatsApp ya da Telegram gruplarına çağıranlara güvenme.",
    ],
    shopping: [
      "Havale ya da EFT ile ödeme yapma.",
      "Sayfanın altında ETBİS logosunu, adres ve telefon bilgisini ara.",
      "Ürünü bilinen bir alışveriş sitesinde de ara; fiyat gerçek dışıysa vazgeç.",
    ],
    tech_support: [
      "Ekrandaki numarayı arama.",
      "Hiçbir program yükleme, kimseye bilgisayarına uzaktan erişim verme.",
      "Sekmeyi kapat; kapanmıyorsa tarayıcıyı kapatıp yeniden aç.",
    ],
  },
  share: {
    label: "Bu linki gönderen kişiyi uyar",
    message: (domain, level) =>
      `Dikkat: “${domain}” adresi ${level === "high" ? "tehlikeli, büyük olasılıkla dolandırıcılık sitesi" : "şüpheli görünüyor"}. ` +
      "Bu linke tıklama ve bilgi girme. (HookGuard ile kontrol ettim.)",
  },
  reportOptions: [
    { value: "phishing", label: "Dolandırıcılık / sahte site" },
    { value: "gambling", label: "Yasadışı bahis" },
    { value: "investment", label: "Sahte yatırım" },
    { value: "shopping", label: "Sahte alışveriş" },
    { value: "tech_support", label: "Sahte virüs uyarısı" },
    { value: "false_positive", label: "Yanlış uyarı: bu site güvenilir" },
    { value: "other", label: "Diğer" },
  ],
  report: {
    title: "Şüpheli site bildir",
    domain: "Bildirdiğin adres:",
    kind: "Ne tür bir site?",
    note: "Not (isteğe bağlı)",
    noteHint: "Örneğin “SMS ile geldi”. Ad, telefon ya da kart bilgisi yazma.",
    submit: "Bildir",
    sending: "Gönderiliyor…",
    done: "Teşekkürler. Bildirimini inceleyeceğiz; onaylanırsa diğer kullanıcılar da bu siteye karşı korunur.",
    failed: "Bildirim gönderilemedi. Biraz sonra yeniden dene.",
  },
  ui: {
    why: "Neden?",
    whatToDo: "Ne yapmalısın?",
    details: "Ayrıntılar",
    score: (n) => `Risk puanı: 100 üzerinden ${n}`,
    home: "HookGuard ana sayfa",
  },
  details: {
    domain: "Alan adı",
    age: "Site ne zamandır var",
    opens: "Site şu an açılıyor mu",
    similarity: "Benzerlik skoru",
    popularity: "Popülerlik",
    threatList: "Tehdit listesi",
    checked: "Kontrol zamanı",
    since: (date) => `${date} tarihinden beri`,
    sharedHost: (host) => `Ücretsiz bir hizmetin üzerinde (${host})`,
    unknown: "Bilinmiyor",
    yes: "Evet",
    no: "Hayır",
    couldNotCheck: "Kontrol edilemedi",
    similarityValue: (pct) => `%${pct} (dolandırıcılık sitelerinin adlarına benzerlik)`,
    notCalculated: "Hesaplanmadı",
    listed: (date) => `Listede (eklenme: ${date})`,
    notListed: "Listede değil",
    popular: [
      "Dünyada en çok ziyaret edilen ilk 1.000 site arasında",
      "Dünyada en çok ziyaret edilen ilk 10.000 site arasında",
      "Dünyada en çok ziyaret edilen ilk 100.000 site arasında",
      "Az bilinen bir site",
    ],
  },
  months: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
  privacyNote: "Sadece alan adı gönderilir; linkin tamamı veya kişisel bilgin gönderilmez.",
  disclaimer:
    "Sonuç; bilinen tehdit listeleri, yapay zekâ modelimiz ve alan adının teknik bilgileri birlikte değerlendirilerek " +
    "hesaplanır. Hiçbir araç %100 garanti veremez.",
  local: {
    listed: "Bu adres, bilinen dolandırıcılık siteleri listesinde yer alıyor.",
    parentListed: (parent) => `Bu sitenin ana adresi (${parent}), bilinen dolandırıcılık siteleri listesinde yer alıyor.`,
    allowlisted: "Resmi ya da çok ziyaret edilen, tanınmış bir site.",
  },
  weekly: (s) => {
    const parts = [
      s.blocked && `${s.blocked} tehlikeli siteyi açılmadan durdurdum`,
      s.warned && `${s.warned} sitede seni uyardım`,
      s.forms && `${s.forms} kez bilgi girmeden önce uyardım`,
      s.downloads && `${s.downloads} şüpheli indirmeyi durdurdum`,
    ].filter(Boolean);
    const checked = `${STAT(s.checked, "tr-TR")} site kontrol edildi.`;
    return parts.length ? `Bu hafta ${parts.join(", ")}. ${checked}` : `Bu hafta tehlikeli bir siteyle karşılaşmadın. ${checked}`;
  },
  locale: "tr-TR",
};

export const CONTENT: Record<Lang, Content> = { en, tr };

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "tr";
}

export const STATUS_TONE: Record<Level, Tone> = { low: "safe", medium: "caution", high: "danger" };

/**
 * A category can raise what the person sees, never the score: an illegal betting site with
 * a clean name must not read "Looks safe". Medium-confidence guesses raise at most to
 * "Be careful"; adult sites only get a neutral note.
 */
const CATEGORY_FLOOR: Record<CategoryId, Level | null> = {
  gambling: "high",
  investment: "medium",
  shopping: "medium",
  adult: null,
  tech_support: "high",
};
const ORDER: Record<Level, number> = { low: 0, medium: 1, high: 2 };

export function displayLevel(level: Level, category: { id: CategoryId; confidence: string } | null): Level {
  let floor = category ? CATEGORY_FLOOR[category.id] : null;
  if (floor === "high" && category?.confidence !== "high") floor = "medium";
  return floor && ORDER[floor] > ORDER[level] ? floor : level;
}

export function whatsappLink(c: Content, domain: string, level: Level): string {
  return `https://wa.me/?text=${encodeURIComponent(c.share.message(domain, level))}`;
}

export function longDate(c: Content, iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${c.months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** The "Details" rows, with plain labels. */
export function detailRows(c: Content, result: Pick<CheckResult, "details" | "checked_utc">): [string, string][] {
  const d = result.details;
  const t = c.details;
  const registered = d.registration?.registered_utc;
  const opens: Record<string, string> = { ok: t.yes, nxdomain: t.no, no_address: t.no };
  const rank = d.tranco_rank;
  const popularity = !rank ? t.popular[3] : rank <= 1000 ? t.popular[0] : rank <= 10000 ? t.popular[1] : t.popular[2];
  return [
    [t.domain, d.registered_domain],
    [t.age, d.shared_host ? t.sharedHost(d.shared_host) : registered ? t.since(longDate(c, registered)) : t.unknown],
    [t.opens, d.dns ? (opens[d.dns.status] ?? t.couldNotCheck) : t.couldNotCheck],
    [t.similarity, d.model_score === null ? t.notCalculated : t.similarityValue(Math.round(d.model_score * 100))],
    [t.popularity, popularity],
    [t.threatList, d.usom ? t.listed(longDate(c, d.usom.listed_utc)) : t.notListed],
    [t.checked, new Date(result.checked_utc).toLocaleString(c.locale)],
  ];
}
