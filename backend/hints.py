"""
HookGuard - name hints

Word lists for the brands Turkish phishing imitates most and for the lure words of
campaign and giveaway scams, and the shared platforms (dynamic DNS, free hosting)
where anyone can take a subdomain. They tag a name for the scoring reasons and feed
the stage 1 model's features; they are not a detector on their own.
"""

from __future__ import annotations

import re

# Simple keyword hints to quickly tag entries that target a known brand.
# This is not a model; it is only for first-pass filtering and statistics.
BRAND_HINTS = {
    # Global
    "paypal": ["paypal"],
    "apple": ["apple", "icloud", "appleid"],
    "microsoft": ["microsoft", "office365", "outlook", "hotmail", "onedrive", "sharepoint"],
    "google": ["google", "gmail"],
    "meta": ["facebook", "instagram", "whatsapp"],
    "amazon": ["amazon"],
    "netflix": ["netflix"],
    "dhl": ["dhl"],
    "fedex": ["fedex"],
    "ups": ["ups"],
    "binance": ["binance"],
    "coinbase": ["coinbase"],
    "metamask": ["metamask"],
    "steam": ["steam", "steamcommunity"],
    "telegram": ["telegram"],
    # Turkey
    "edevlet": ["edevlet", "e-devlet", "turkiye-gov", "turkiyegov", "devlet-destek", "edevletim"],
    "ziraat": ["ziraat"],
    "isbank": ["isbank", "is-bank", "isbankasi", "iscep"],
    "garanti": ["garanti", "bbva"],
    "akbank": ["akbank"],
    "yapikredi": ["yapikredi", "yapi-kredi"],
    "halkbank": ["halkbank"],
    "vakifbank": ["vakifbank"],
    "qnb": ["qnb", "enpara"],
    "denizbank": ["denizbank"],
    "ptt": ["ptt", "pttavm"],
    "kargo": ["kargo", "yurtici", "aras", "mngkargo", "suratkargo"],
    "hepsiburada": ["hepsiburada"],
    "trendyol": ["trendyol"],
    "turkcell": ["turkcell"],
    "vodafone": ["vodafone"],
    "turktelekom": ["turktelekom", "turk-telekom"],
    "sgk": ["sgk"],
    "gib": ["gib", "ivd", "vergi"],
    "teb": ["teb", "cepteteb"],
    "a101": ["a101", "a-101", "101", "a1o1", "ai01", "al01", "aio1", "alo1"],
    "bim": ["bim"],
    "sok": ["sok", "sokmarket"],
    "migros": ["migros"],
    "istanbulkart": ["istanbulkart", "istkart", "istanbulbel", "ibb"],
    "hgs": ["hgs", "hizli-gecis", "hizligecis"],
    "sahibinden": ["sahibinden"],
    "mhrs": ["mhrs", "rndvakti"],
    "toki": ["toki"],
    "uyap": ["uyap", "ehaciz", "e-haciz", "ehazine"],
}

# Lure words of Turkish campaign / giveaway scams. Kept apart from brands so
# brand statistics stay clean.
LURE_HINTS = {
    "kampanya": ["kampanya", "kampanyam", "kmpnya"],
    "basvuru": ["basvuru", "bsvr"],
    "hediye": ["hediye"],
    "indirim": ["indirim", "indcrm"],
    "firsat": ["firsat"],
    "bakiye": ["bakiye", "baakiye"],
    "cekilis": ["cekilis"],
    "kazan": ["kazan", "kazandin", "kazandiniz"],
    "odul": ["odul"],
    "iade": ["iade"],
}

# Dynamic DNS, free hosting and app platforms: anyone can take a subdomain, so only the part
# under the platform tells something about the site. Public suffixes such as com.tr are not here.
SHARED_PLATFORMS = {
    # dynamic DNS
    "duckdns.org", "myonlineportal.ch", "myonlineportal.at", "my-homeip.de", "my-homeip.com",
    "webredirect.org", "giize.com", "abrdns.com", "loseyourip.com", "dns64.de", "bounceme.net",
    "dpdns.org",
    # hosting and app platforms
    "web.app", "firebaseapp.com", "vercel.app", "netlify.app", "blogspot.com", "github.io",
    "pages.dev", "workers.dev", "r2.dev", "trycloudflare.com", "22web.org", "railway.app",
    "up.railway.app", "onrender.com", "lovable.app", "wasmer.app", "myshopify.com",
    "onmicrosoft.com", "weebly.com", "wixsite.com", "square.site", "glitch.me", "ngrok-free.app",
    "herokuapp.com", "azurewebsites.net", "appspot.com", "webflow.io", "framer.app",
    "replit.app", "godaddysites.com", "000webhostapp.com",
}


def _word_hit(word: str, flat: str, tokens: set[str]) -> bool:
    # Short words ("ptt", "ups", "aras") also appear inside other words
    # ("paras", "groups"), so they only match as a separate token.
    if any(ch.isdigit() for ch in word):
        # Numbers and homoglyphs ("101", "a1o1") must start a token and be followed by a
        # letter or nothing: "101kapndasmdi" and "a1o1halftan" count, hex strings such as
        # "b12aa101b5" or "a1019ecd5717" do not.
        return any(t.startswith(word) and (len(t) == len(word) or t[len(word)].isalpha()) for t in tokens)
    if len(word) <= 4:
        return word in tokens
    return word in flat


def _hints(entry: str, table: dict[str, list[str]]) -> str:
    host = entry.split("/", 1)[0]
    flat = host.replace(".", "-")
    tokens = set(re.split(r"[-._]", host))
    hits = [name for name, words in table.items() if any(_word_hit(w, flat, tokens) for w in words)]
    return ";".join(hits)


def brand_hint(entry: str) -> str:
    return _hints(entry, BRAND_HINTS)


def lure_hint(entry: str) -> str:
    return _hints(entry, LURE_HINTS)


def chosen_part(domain: str) -> str:
    """The part of a name its owner picked: 'cloud-dario.duckdns.org' -> 'cloud-dario'."""
    labels = domain.split(".")
    for i in range(1, len(labels) - 1):  # longest platform suffix first ("up.railway.app")
        if ".".join(labels[i:]) in SHARED_PLATFORMS:
            return ".".join(labels[:i])
    return domain
