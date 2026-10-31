"""
HookGuard - site categories

Some harm is not phishing: illegal betting, fake investment schemes, fake shops and,
for family mode, adult sites. This module guesses such a category from the host name
alone; it does not change the risk score.

There is no training data for these categories yet, so the guesses come from word
lists and one telling shape: illegal betting sites move from siteadi845.com to
siteadi846.com each time an address is blocked, so a betting word or brand followed
by a number is a strong sign. The browser extension adds what only the page itself
shows (phrases such as "deneme bonusu", a missing ETBİS badge on a shop).

Licensed Turkish betting sites are never flagged. The list below must be kept in step
with the dealers Spor Toto and TJK authorize; a false alarm on a legal site costs more
trust than a missed illegal one.
"""

from __future__ import annotations

import re
from datetime import datetime

from .domains import is_ip, parents, registered_domain
from .references import References
from .scoring import Facts

# Licensed in Turkey (Spor Toto, TJK, Milli Piyango and their authorized online dealers).
LEGAL_BETTING = {
    "iddaa.com", "nesine.com", "bilyoner.com", "misli.com", "oley.com", "birebin.com", "tuttur.com",
    "sportoto.gov.tr", "tjk.org", "millipiyangoonline.com",
}
# Offshore betting brands that advertise to Turkey without a licence; their mirrors add numbers.
ILLEGAL_BETTING_BRANDS = (
    "bets10", "mobilbahis", "youwin", "superbetin", "casibom", "betboo", "tipobet", "sekabet", "jojobet",
    "matbet", "onwin", "holiganbet", "marsbahis", "imajbet", "grandpashabet", "meritking", "kingroyal",
    "bahsegel", "pusulabet", "tempobet", "dinamobet", "betist", "betpark", "sahabet", "palacebet",
    "artemisbet", "vdcasino", "betkanyon", "bettilt", "restbet", "nakitbahis", "casinometropol",
    "maltcasino", "betgaranti", "rinabet", "piabet", "betvole", "hiltonbet", "kralbet", "betexper",
    "ngsbahis", "betmatik", "betsat", "1xbet", "mostbet", "melbet", "betwoon", "betcio", "padisahbet",
    "betticket", "trendbet", "perabet", "mariobet", "limanbet", "betnano", "vaycasino", "baywin",
)
GAMBLING_WORDS = ("bahis", "casino", "kazino", "kumar", "slot", "rulet", "poker", "jackpot", "freespin",
                  "iddaa", "canlibahis", "betting")
GAMBLING_HINTS = ("giris", "guncel", "yeniadres", "bonus", "deneme", "mobil", "tv")
INVESTMENT_WORDS = ("yatirim", "kripto", "crypto", "bitcoin", "coin", "borsa", "forex", "trading", "kazanc",
                    "getiri", "invest", "profit", "mining", "madencilik")
SHOPPING_WORDS = ("indirim", "outlet", "magaza", "satis", "sepet", "firsat", "ucuz", "kampanya", "shop",
                  "store", "butik", "alisveris", "market")
ADULT_SUBSTRINGS = ("porn", "xvideo", "xhamster", "xnxx", "brazzers", "onlyfans", "hentai", "escort", "erotik")
ADULT_TOKENS = {"sex", "xxx", "nude", "adult", "porno"}

LABELS = {
    "tr": {"gambling": "Yasadışı bahis sitesi", "investment": "Sahte yatırım sitesi olabilir",
           "shopping": "Sahte alışveriş sitesi olabilir", "adult": "Yetişkin içerikli site"},
    "en": {"gambling": "Illegal betting site", "investment": "Possible fake investment site",
           "shopping": "Possible fake shop", "adult": "Adult site"},
}
# Reasons, by the code guess() returns.
TEXT = {
    "tr": {
        "gambling_brand": "Adında Türkiye'de izinsiz yayın yapan bir bahis markasının adı geçiyor.",
        "gambling_mirror": "Bahis sitelerinin kapatıldıkça numara değiştirerek açtığı yeni adreslere benziyor.",
        "gambling_word": "Adında bahis ve kumarla ilgili kelimeler var.",
        "investment": "Adında yatırım ve kazanç vaadi içeren kelimeler var ve site yeni ya da tanınmıyor.",
        "shopping": "Yeni açılmış bir alışveriş sitesine benziyor; sahte alışveriş siteleri genellikle çok yenidir.",
        "adult": "Adı yetişkin içerikli sitelere benziyor.",
        "community": "Kullanıcılarımızın bildirdiği ve incelediğimiz siteler arasında.",
    },
    "en": {
        "gambling_brand": "The name contains a betting brand that operates in Turkey without a licence.",
        "gambling_mirror": "It looks like the numbered new addresses betting sites open as old ones are blocked.",
        "gambling_word": "The name contains betting and gambling words.",
        "investment": "The name promises investment returns and the site is new or unknown.",
        "shopping": "It looks like a newly opened shop; fake shops are usually very new.",
        "adult": "The name looks like an adult site.",
        "community": "Reported by our users and reviewed by us.",
    },
}


def registered_days(facts: Facts) -> int | None:
    created = (facts.registration or {}).get("registered_utc")
    if not created:
        return None
    return max(0, (facts.now - datetime.fromisoformat(created.replace("Z", "+00:00"))).days)


def _label(host: str) -> str:
    """The name the owner chose, without www. and the registry suffix: 'www.betcio845.com' -> 'betcio845'."""
    domain = registered_domain(host)
    sub = host[: -len(domain)].rstrip(".").removeprefix("www").strip(".")
    return (sub + "." if sub else "") + domain.split(".")[0]


def guess(host: str, refs: References, facts: Facts) -> tuple[str, str, str] | None:
    """(category, confidence, reason code) from the name alone, or None."""
    if is_ip(host) or any(p in LEGAL_BETTING for p in parents(host)):
        return None
    label = _label(host)
    flat = re.sub(r"[^a-z0-9]", "", label)
    tokens = set(re.split(r"[^a-z]+", label)) - {""}
    trusted = bool(refs.official_brand(host))
    popular = registered_domain(host) in refs.ranks
    days = registered_days(facts)
    new_or_unknown = days is None or days < 180

    community = next((refs.categories[p] for p in parents(host) if p in refs.categories), None)
    if community:
        return community, "high", "community"
    if not trusted:
        if any(b in flat for b in ILLEGAL_BETTING_BRANDS):
            return "gambling", "high", "gambling_brand"
        mirror = re.search(r"\d{2,4}$", flat) or any(h in flat for h in GAMBLING_HINTS)
        # "bet" alone is too common (alphabet, better, bethesda): it counts with a number or a betting hint.
        bet = re.search(r"bet\d", flat) or (re.search(r"(^|[^a-z])bet|bet([^a-z]|$)", label) and mirror)
        if any(w in flat for w in GAMBLING_WORDS) or bet:
            return ("gambling", "high", "gambling_mirror") if mirror else ("gambling", "medium", "gambling_word")
        if any(s in flat for s in ADULT_SUBSTRINGS) or tokens & ADULT_TOKENS or label.startswith("sex"):
            return "adult", "high", "adult"
    if trusted or popular:
        return None
    if any(w in flat for w in INVESTMENT_WORDS) and new_or_unknown:
        return "investment", "medium", "investment"
    if any(w in flat for w in SHOPPING_WORDS) and days is not None and days < 90:
        return "shopping", "medium", "shopping"
    return None


def classify(host: str, refs: References, facts: Facts, lang: str = "tr") -> dict | None:
    found = guess(host, refs, facts)
    if found is None:
        return None
    category, confidence, code = found
    return {"id": category, "label": LABELS[lang][category], "confidence": confidence, "reasons": [TEXT[lang][code]]}
