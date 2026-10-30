/**
 * What only the page itself shows, read on this device and never sent anywhere: phrases of
 * illegal betting and fake investment pages, a shop without an ETBİS registration, and the
 * scare screens of fake tech support. Only the conclusion (a category and its reasons in
 * plain words) goes to the background.
 */

import type { Lang } from "@shared/content";
import type { PageSignal } from "@/utils/messages";
import type { Verdict } from "@/utils/verdicts";

const MAX_TEXT = 30_000;

const GAMBLING_STRONG = [
  "deneme bonusu", "güncel giriş", "çevrimsiz", "kayıp bonusu", "yatırım bonusu", "freespin", "free spin",
  "welcome bonus", "no deposit bonus", "new login address",
];
const GAMBLING_WEAK = [
  "canlı bahis", "canlı casino", "casino", "slot", "bahis", "rulet", "poker", "jackpot", "bonus", "live betting", "roulette",
];
const INVESTMENT = [
  "günlük %", "günde %", "aylık %", "garantili kazanç", "garantili getiri", "pasif gelir", "yatırımınızı katlayın",
  "kazancınızı çekin", "minimum yatırım", "yapay zeka ile kazan", "kripto robot", "risksiz kazanç",
  "guaranteed profit", "guaranteed return", "daily profit", "% per day", "% daily", "passive income",
  "withdraw your profit", "risk-free profit", "trading bot",
];
const SCARE = [
  "virüs", "virus", "trojan", "casus yazılım", "spyware", "bilgisayarınız kilitlendi", "bilgisayarınız engellendi",
  "windows defender", "microsoft destek", "teknik destek", "your computer", "has been blocked", "is infected",
  "call microsoft", "tech support", "hemen arayın", "call now", "do not restart", "bilgisayarınızı kapatmayın",
];
const SUPPORT_PHONE = /0?\s?8[05]0[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\+?1[\s-]?\(?8\d{2}\)?[\s-]?\d{3}[\s-]?\d{4}/;

export function pageText(): string {
  return (document.body?.innerText ?? "").slice(0, MAX_TEXT).toLocaleLowerCase("tr-TR");
}

const hits = (text: string, words: string[]) => words.filter((w) => text.includes(w));
const quote = (words: string[]) => words.slice(0, 3).map((w) => `“${w}”`).join(", ");

const TEXT = {
  en: {
    gambling: (w: string) => `The page uses phrases typical of illegal betting sites: ${w}.`,
    investment: (w: string) => `The page makes unrealistic promises of profit: ${w}.`,
    noEtbis: "The page shows no registration with the Ministry of Trade's e-commerce system (ETBİS).",
    young: (d: number) => `The site was set up only ${d} days ago.`,
    discount: (n: number) => `It shows unrealistic discounts (up to ${n}%).`,
    noContact: "The page gives no contact details such as a phone number or email address.",
    scare: "The page says your computer has a virus and asks you to call a number.",
    fullscreen: "The page made itself full screen.",
    noisy: "The page is playing an alarm sound.",
  },
  tr: {
    gambling: (w: string) => `Sayfada yasadışı bahis sitelerine özgü ifadeler var: ${w}.`,
    investment: (w: string) => `Sayfada gerçek dışı kazanç vaatleri var: ${w}.`,
    noEtbis: "Sayfada Ticaret Bakanlığı'nın e-ticaret kaydı (ETBİS) görünmüyor.",
    young: (d: number) => `Site yalnızca ${d} gün önce açılmış.`,
    discount: (n: number) => `Gerçek dışı indirimler var (%${n}'e varan).`,
    noContact: "Sayfada telefon ya da e-posta gibi iletişim bilgisi yok.",
    scare: "Sayfa bilgisayarında virüs olduğunu söyleyip bir numarayı aramanı istiyor.",
    fullscreen: "Sayfa kendini tam ekran açtı.",
    noisy: "Sayfa alarm sesi çalıyor.",
  },
};

export function gamblingSignal(text: string, lang: Lang): PageSignal | null {
  const strong = hits(text, GAMBLING_STRONG);
  const weak = hits(text, GAMBLING_WEAK);
  if (!strong.length || strong.length + weak.length < 3) return null;
  return {
    id: "gambling",
    confidence: "high",
    reasons: [TEXT[lang].gambling(quote(strong))],
  };
}

export function investmentSignal(text: string, lang: Lang): PageSignal | null {
  const found = hits(text, INVESTMENT);
  if (found.length < 2) return null;
  return {
    id: "investment",
    confidence: "medium",
    reasons: [TEXT[lang].investment(quote(found))],
  };
}

/** A shop page (prices and a cart) without the ETBİS registration legal Turkish shops show. */
export function shoppingSignal(text: string, verdict: Verdict | null, lang: Lang): PageSignal | null {
  const prices = text.match(/(₺|\btl\b)\s?\d|\d[\d.,]*\s?(₺|tl\b)/g)?.length ?? 0;
  if (prices < 3 || !/sepete ekle|satın al|sepetim|add to cart|buy now/.test(text)) return null;
  const etbis = text.includes("etbis") || document.querySelector('a[href*="etbis"], img[alt*="etbis" i], img[src*="etbis" i]');
  if (etbis) return null;
  const discounts = [...text.matchAll(/%\s?(\d{2})\s*(indirim|ind\.)|(\d{2})\s?%\s*indirim/g)].map((m) => Number(m[1] ?? m[3]));
  const huge = Math.max(0, ...discounts);
  const contact = /(\+90|0)\s?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/.test(text) || /@[a-z0-9-]+\.[a-z]/.test(text);
  const young = verdict?.ageDays != null && verdict.ageDays < 90;
  if (!young && huge < 70 && contact) return null;
  const t = TEXT[lang];
  const reasons = [t.noEtbis];
  if (young) reasons.push(t.young(verdict?.ageDays ?? 0));
  if (huge >= 70) reasons.push(t.discount(huge));
  if (!contact) reasons.push(t.noContact);
  return { id: "shopping", confidence: "medium", reasons };
}

export function techSupportSignal(text: string, lang: Lang): PageSignal | null {
  const scare = hits(text, SCARE);
  const phone = SUPPORT_PHONE.test(text);
  const fullscreen = Boolean(document.fullscreenElement);
  const noisy = [...document.querySelectorAll<HTMLMediaElement>("audio, video")].some((m) => !m.paused && !m.muted);
  if (!(phone && (scare.length >= 2 || (scare.length >= 1 && (fullscreen || noisy))))) return null;
  const t = TEXT[lang];
  const reasons = [t.scare];
  if (fullscreen) reasons.push(t.fullscreen);
  if (noisy) reasons.push(t.noisy);
  return { id: "tech_support", confidence: "high", reasons };
}

/** Takes the scare page down at once: leaves full screen and silences its alarm. */
export function calmPage(): void {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  document.querySelectorAll<HTMLMediaElement>("audio, video").forEach((m) => m.pause());
}
