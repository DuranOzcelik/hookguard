"""
HookGuard - risk score

Combines the evidence on one host name into a 0-100 score and the reasons behind
it. Every reason carries the points it added or removed.

Evidence that adds up:
- stage 1 model: nothing below 0.3; up to 40 below the model's threshold; 50-60 above it,
  where only about one in a thousand new certificate names scores
- a brand's name in a domain that is not the brand's: +10; lure words (kampanya, hediye): +5
- registered less than 7 days ago: +20, less than 30: +12, less than 90: +6; over 2 years ago: -10
- a subdomain of a shared host (duckdns.org, ddns.net): +5; a bare IP address: +25
- a subdomain of a popular site: -15
Overrides, applied last:
- an official brand domain scores at most 5, a popular site (Tranco top 100,000) at most 15
- a name USOM lists scores at least 95, a subdomain of one at least 90, and a host that
  resolves to a listed IP address at least 85

Levels: high from 70 (the extension stops the page), medium from 40 (warning banner), low below.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from .domains import is_ip, parents, registered_domain
from .hints import brand_hint, lure_hint
from .references import References

HIGH, MEDIUM = 70, 40

# What a USOM category means to a reader: "a list of known ...".
CATEGORIES = {
    "tr": {"PH": "dolandırıcılık siteleri", "BP": "dolandırıcılık siteleri",
           "MC": "virüs ve zararlı yazılım yayan siteler", "MD": "virüs ve zararlı yazılım yayan siteler",
           "MI": "virüs ve zararlı yazılım yayan siteler", "MU": "virüs ve zararlı yazılım yayan siteler",
           "CA": "saldırı kaynağı adresler"},
    "en": {"PH": "scam sites", "BP": "scam sites", "MC": "sites spreading viruses and malware",
           "MD": "sites spreading viruses and malware", "MI": "sites spreading viruses and malware",
           "MU": "sites spreading viruses and malware", "CA": "attack sources"},
}
OTHER_CATEGORY = {"tr": "zararlı siteler", "en": "harmful sites"}
MONTHS = {
    "tr": ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
    "en": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
           "November", "December"],
}

# Texts the user reads: plain language, no names of sources, lists or techniques.
TEXT = {
    "tr": {
        "usom_listed": "Bu adres, bilinen {category} listesinde yer alıyor.",
        "usom_parent": "Bu sitenin ana adresi ({parent}), bilinen {category} listesinde yer alıyor.",
        "usom_ip": "Bu site, bilinen zararlı sitelerin kullandığı bir sunucuda çalışıyor.",
        "official": "{brand} markasının resmi sitesi.",
        "popular": "Çok ziyaret edilen, tanınmış bir site.",
        "popular_parent": "Tanınmış {parent} sitesinin bir alt adresi.",
        "model_high": "Bu adres, daha önce dolandırıcılıkta kullanılmış sitelerin adlarına çok benziyor.",
        "model_mid": "Bu adres, dolandırıcılıkta kullanılmış sitelerin adlarına biraz benziyor.",
        "model_low": "Bu adres, dolandırıcılıkta kullanılmış sitelerin adlarına benzemiyor.",
        "brand": "Adında {brands} geçiyor ama bu, o markanın resmi sitesi değil.",
        "lure": "Adında dolandırıcıların sık kullandığı kelimeler var: {words}.",
        "age_new": "Bu site {ago} açılmış ({date}). Dolandırıcılık siteleri genellikle çok yenidir.",
        "age_mid": "Bu site yaklaşık {months} ay önce açılmış ({date}).",
        "age_old": "Bu site {years} yıldır var.",
        "age_unknown": "Sitenin ne zamandır var olduğu bilgisine ulaşılamadı.",
        "shared_host": "Bu adres, herkesin ücretsiz site açabildiği bir hizmetin ({host}) üzerinde; "
                       "dolandırıcılar da böyle adresleri kolayca açabilir.",
        "ip_host": "Link bir site adı yerine yalnızca sayılardan oluşan bir adrese gidiyor; "
                   "güvenilir siteler bunu nadiren yapar.",
        "dns_nxdomain": "Bu site şu an açılmıyor; kapatılmış ya da henüz kurulmamış olabilir.",
        "dns_no_address": "Bu site şu an açılmıyor.",
        "dns_failed": "Sitenin şu an açılıp açılmadığı kontrol edilemedi.",
    },
    "en": {
        "usom_listed": "This address is on a list of known {category}.",
        "usom_parent": "This site's main address ({parent}) is on a list of known {category}.",
        "usom_ip": "This site runs on a server used by known harmful sites.",
        "official": "The official site of {brand}.",
        "popular": "A well-known, widely visited site.",
        "popular_parent": "Part of the well-known site {parent}.",
        "model_high": "This address closely resembles the names of sites used in scams before.",
        "model_mid": "This address somewhat resembles the names of sites used in scams.",
        "model_low": "This address does not resemble the names of sites used in scams.",
        "brand": "The name contains {brands}, but this is not that brand's official site.",
        "lure": "The name contains words scammers often use: {words}.",
        "age_new": "This site was set up {ago} ({date}). Scam sites are usually very new.",
        "age_mid": "This site was set up about {months} months ago ({date}).",
        "age_old": "This site has existed for {years} years.",
        "age_unknown": "We could not find out how long this site has existed.",
        "shared_host": "This address is on a free service where anyone can open a site ({host}); "
                       "scammers can too.",
        "ip_host": "The link goes to an address made only of numbers instead of a site name; "
                   "trustworthy sites rarely do this.",
        "dns_nxdomain": "This site does not open right now; it may have been taken down or not set up yet.",
        "dns_no_address": "This site does not open right now.",
        "dns_failed": "We could not check whether this site opens right now.",
    },
}


def long_date(dt: datetime, lang: str) -> str:
    return f"{dt.day} {MONTHS[lang][dt.month - 1]} {dt.year}"


@dataclass
class Facts:
    dns: dict | None = None           # Lookups.resolve
    registration: dict | None = None  # Lookups.registration
    now: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


def model_points(p: float, threshold: float) -> int:
    if p >= threshold:
        return round(50 + 10 * (p - threshold) / (1 - threshold))
    if p < 0.3:
        return 0
    return round(40 * (p - 0.3) / (threshold - 0.3))


def level(score: int) -> str:
    return "high" if score >= HIGH else "medium" if score >= MEDIUM else "low"


def assess(host: str, refs: References, facts: Facts, lang: str = "tr") -> dict:
    text = TEXT[lang]
    num = (lambda n: f"{n:,}".replace(",", ".")) if lang == "tr" else (lambda n: f"{n:,}")
    dec = (lambda x: f"{x:.2f}".replace(".", ",")) if lang == "tr" else (lambda x: f"{x:.2f}")
    category = lambda c: CATEGORIES[lang].get(c, OTHER_CATEGORY[lang])  # noqa: E731
    reasons: list[dict] = []

    def add(code: str, points: int, severity: str, **values) -> None:
        reasons.append({"code": code, "points": points, "severity": severity, "text": text[code].format(**values)})

    ip = is_ip(host)
    domain = host if ip else registered_domain(host)
    usom = refs.usom_match(host)
    official = refs.official_brand(host)
    shared = None if ip else refs.shared_host(host)
    rank = parent_rank = parent = None
    if not ip and not shared:
        if host in (domain, "www." + domain):
            rank = refs.ranks.get(domain)
        else:
            parent, parent_rank = next(((p, refs.ranks[p]) for p in parents(host)[1:] if p in refs.ranks),
                                       (None, None))
    trusted = bool(official or rank)
    p = refs.model_score(host)

    score = 0
    if ip:
        score += 25
        add("ip_host", 25, "warning")
    if shared:
        score += 5
        add("shared_host", 5, "warning", host=shared)
    if parent_rank:
        score -= 15
        add("popular_parent", -15, "safe", parent=parent, rank=num(parent_rank))
    if p is not None and not trusted:
        points = model_points(p, refs.threshold)
        score += points
        code = "model_high" if p >= refs.threshold else "model_mid" if points else "model_low"
        add(code, points, "danger" if code == "model_high" else "warning" if points else "info", p=dec(p))
    if not ip and not official:
        brands = [b for b in brand_hint(host).split(";") if b]
        if brands:
            score += 10
            add("brand", 10, "warning", brands=", ".join(f"“{b}”" for b in brands))
        lures = [w for w in lure_hint(host).split(";") if w]
        if lures and not trusted:
            score += 5
            add("lure", 5, "warning", words=", ".join(lures))

    registered = (facts.registration or {}).get("registered_utc")
    if not ip and not shared and facts.registration is not None:
        if registered:
            created = datetime.fromisoformat(registered.replace("Z", "+00:00"))
            days = max(0, (facts.now - created).days)
            date = long_date(created, lang)
            if days < 90:
                points = 20 if days < 7 else 12 if days < 30 else 6
                score += points
                ago = {"tr": ("bugün", f"yalnızca {days} gün önce"), "en": ("today", f"only {days} days ago")}[lang]
                add("age_new", points, "danger" if days < 30 else "warning", ago=ago[days > 0], date=date)
            elif days > 730:
                score -= 10
                add("age_old", -10, "safe", years=days // 365)
            else:
                add("age_mid", 0, "info", months=round(days / 30), date=date)
        else:
            add("age_unknown", 0, "info")

    dns = facts.dns or {}
    if dns.get("status") == "nxdomain":
        add("dns_nxdomain", 0, "info")
    elif dns.get("status") == "no_address":
        add("dns_no_address", 0, "info")
    elif dns.get("status") in ("timeout", "error"):
        add("dns_failed", 0, "info")

    score = max(0, min(100, score))

    def override(code: str, new: int, severity: str, **values) -> None:
        nonlocal score
        add(code, new - score, severity, **values)
        score = new

    if official:
        override("official", min(score, 5), "safe", brand=official)
    elif rank:
        override("popular", min(score, 15), "safe", rank=num(rank))
    listed_ip = next((refs.usom[a] for a in dns.get("addresses", []) if a in refs.usom), None)
    exact = usom is not None and usom in (refs.usom.get(host), refs.usom.get(host.removeprefix("www.")))
    if exact:
        override("usom_listed", max(score, 95), "danger", date=usom.listed_utc[:10], category=category(usom.category))
    elif usom:
        override("usom_parent", max(score, 90), "danger", parent=usom.entry, date=usom.listed_utc[:10],
                 category=category(usom.category))
    elif listed_ip:
        override("usom_ip", max(score, 85), "danger", ip=listed_ip.entry, category=category(listed_ip.category))

    # A USOM listing decides the score even when the other evidence had already reached it.
    order = {"danger": 0, "warning": 1, "safe": 2, "info": 3}
    reasons.sort(key=lambda r: (not r["code"].startswith("usom"), order[r["severity"]], -abs(r["points"])))
    return {
        "domain": host,
        "score": score,
        "level": level(score),
        "reasons": reasons,
        "details": {
            "registered_domain": domain,
            "model_score": None if p is None else round(p, 4),
            "model_threshold": None if refs.threshold is None else round(refs.threshold, 4),
            "usom": None if usom is None else {"entry": usom.entry, "listed_utc": usom.listed_utc,
                                                "category": usom.category, "usom_id": usom.usom_id},
            "official_brand": official,
            "shared_host": shared,
            "tranco_rank": rank or parent_rank,
            "dns": facts.dns,
            "registration": facts.registration,
        },
    }
