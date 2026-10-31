/**
 * What the on-device check tells people: the reason texts of backend/scoring.py and
 * backend/categories.py, kept word for word (web/src/engine.parity.test.ts compares them).
 * Plain language, no names of sources, lists or techniques.
 */

import type { Lang } from "../content";

type Values = Record<string, string>;

/** What a USOM category means to a reader: "a list of known ...". */
export const LIST_CATEGORIES: Record<Lang, Record<string, string>> = {
  tr: {
    PH: "dolandırıcılık siteleri",
    BP: "dolandırıcılık siteleri",
    MC: "virüs ve zararlı yazılım yayan siteler",
    MD: "virüs ve zararlı yazılım yayan siteler",
    MI: "virüs ve zararlı yazılım yayan siteler",
    MU: "virüs ve zararlı yazılım yayan siteler",
    CA: "saldırı kaynağı adresler",
  },
  en: {
    PH: "scam sites",
    BP: "scam sites",
    MC: "sites spreading viruses and malware",
    MD: "sites spreading viruses and malware",
    MI: "sites spreading viruses and malware",
    MU: "sites spreading viruses and malware",
    CA: "attack sources",
  },
};
export const OTHER_LIST_CATEGORY: Record<Lang, string> = { tr: "zararlı siteler", en: "harmful sites" };

export type ReasonCode =
  | "usom_listed"
  | "usom_parent"
  | "official"
  | "popular"
  | "popular_parent"
  | "model_high"
  | "model_mid"
  | "model_low"
  | "brand"
  | "lure"
  | "shared_host"
  | "ip_host";
export type CategoryReason =
  | "gambling_brand"
  | "gambling_mirror"
  | "gambling_word"
  | "investment"
  | "shopping"
  | "adult"
  | "community";
export type CategoryId = "gambling" | "investment" | "shopping" | "adult";

export const REASONS: Record<Lang, Record<ReasonCode, (v: Values) => string>> = {
  tr: {
    usom_listed: (v) => `Bu adres, bilinen ${v.category} listesinde yer alıyor.`,
    usom_parent: (v) => `Bu sitenin ana adresi (${v.parent}), bilinen ${v.category} listesinde yer alıyor.`,
    official: (v) => `${v.brand} markasının resmi sitesi.`,
    popular: () => "Çok ziyaret edilen, tanınmış bir site.",
    popular_parent: (v) => `Tanınmış ${v.parent} sitesinin bir alt adresi.`,
    model_high: () => "Bu adres, daha önce dolandırıcılıkta kullanılmış sitelerin adlarına çok benziyor.",
    model_mid: () => "Bu adres, dolandırıcılıkta kullanılmış sitelerin adlarına biraz benziyor.",
    model_low: () => "Bu adres, dolandırıcılıkta kullanılmış sitelerin adlarına benzemiyor.",
    brand: (v) => `Adında ${v.brands} geçiyor ama bu, o markanın resmi sitesi değil.`,
    lure: (v) => `Adında dolandırıcıların sık kullandığı kelimeler var: ${v.words}.`,
    shared_host: (v) =>
      `Bu adres, herkesin ücretsiz site açabildiği bir hizmetin (${v.host}) üzerinde; dolandırıcılar da böyle adresleri kolayca açabilir.`,
    ip_host: () =>
      "Link bir site adı yerine yalnızca sayılardan oluşan bir adrese gidiyor; güvenilir siteler bunu nadiren yapar.",
  },
  en: {
    usom_listed: (v) => `This address is on a list of known ${v.category}.`,
    usom_parent: (v) => `This site's main address (${v.parent}) is on a list of known ${v.category}.`,
    official: (v) => `The official site of ${v.brand}.`,
    popular: () => "A well-known, widely visited site.",
    popular_parent: (v) => `Part of the well-known site ${v.parent}.`,
    model_high: () => "This address closely resembles the names of sites used in scams before.",
    model_mid: () => "This address somewhat resembles the names of sites used in scams.",
    model_low: () => "This address does not resemble the names of sites used in scams.",
    brand: (v) => `The name contains ${v.brands}, but this is not that brand's official site.`,
    lure: (v) => `The name contains words scammers often use: ${v.words}.`,
    shared_host: (v) => `This address is on a free service where anyone can open a site (${v.host}); scammers can too.`,
    ip_host: () =>
      "The link goes to an address made only of numbers instead of a site name; trustworthy sites rarely do this.",
  },
};

export const CATEGORY_LABELS: Record<Lang, Record<CategoryId, string>> = {
  tr: {
    gambling: "Yasadışı bahis sitesi",
    investment: "Sahte yatırım sitesi olabilir",
    shopping: "Sahte alışveriş sitesi olabilir",
    adult: "Yetişkin içerikli site",
  },
  en: {
    gambling: "Illegal betting site",
    investment: "Possible fake investment site",
    shopping: "Possible fake shop",
    adult: "Adult site",
  },
};

export const CATEGORY_REASONS: Record<Lang, Record<CategoryReason, string>> = {
  tr: {
    gambling_brand: "Adında Türkiye'de izinsiz yayın yapan bir bahis markasının adı geçiyor.",
    gambling_mirror: "Bahis sitelerinin kapatıldıkça numara değiştirerek açtığı yeni adreslere benziyor.",
    gambling_word: "Adında bahis ve kumarla ilgili kelimeler var.",
    investment: "Adında yatırım ve kazanç vaadi içeren kelimeler var ve site yeni ya da tanınmıyor.",
    shopping: "Yeni açılmış bir alışveriş sitesine benziyor; sahte alışveriş siteleri genellikle çok yenidir.",
    adult: "Adı yetişkin içerikli sitelere benziyor.",
    community: "Kullanıcılarımızın bildirdiği ve incelediğimiz siteler arasında.",
  },
  en: {
    gambling_brand: "The name contains a betting brand that operates in Turkey without a licence.",
    gambling_mirror: "It looks like the numbered new addresses betting sites open as old ones are blocked.",
    gambling_word: "The name contains betting and gambling words.",
    investment: "The name promises investment returns and the site is new or unknown.",
    shopping: "It looks like a newly opened shop; fake shops are usually very new.",
    adult: "The name looks like an adult site.",
    community: "Reported by our users and reviewed by us.",
  },
};
