"""
HookGuard - short links

Scam SMS messages often hide the real address behind a link shortener. The web page
can ask where such a link leads: the API follows the shortener's redirects one hop at
a time and stops at the first address outside the shorteners below. The destination
itself is never requested, so a scammer's server never sees the check, and only its
host name is returned.

Only the services below are ever contacted, which also keeps the endpoint from being
used to make requests elsewhere. The list must match SHORTENERS in shared/hookguard.ts.
"""

from __future__ import annotations

from urllib.parse import urljoin, urlsplit

import requests

from .domains import normalize_host

SHORTENERS = {
    "bit.ly", "bitly.com", "tinyurl.com", "t.co", "cutt.ly", "is.gd", "v.gd", "ow.ly", "rebrand.ly",
    "shorturl.at", "rb.gy", "t.ly", "s.id", "tiny.cc", "bl.ink", "buff.ly", "lnkd.in", "goo.su", "clck.ru",
    "qrco.de", "u.to", "short.gy",
}
MAX_HOPS = 5
TIMEOUT = 5
HEADERS = {"User-Agent": "HookGuard link check (+https://github.com/DuranOzcelik/hookguard)"}


def is_short_link(host: str) -> bool:
    return host in SHORTENERS


def expand(url: str) -> dict:
    """{'short_host', 'destination' (host or None), 'hops'}; raises ValueError for anything but a short link."""
    if "://" not in url:
        url = "https://" + url.strip()
    first = normalize_host(url)
    if first is None or not is_short_link(first):
        raise ValueError("not a short link")
    current, hops = url, 0
    while hops < MAX_HOPS:
        host = normalize_host(current)
        if host is None:
            return {"short_host": first, "destination": None, "hops": hops}
        if not is_short_link(host):
            return {"short_host": first, "destination": host, "hops": hops}
        if urlsplit(current).scheme not in ("http", "https"):
            break
        try:
            with requests.get(current, allow_redirects=False, timeout=TIMEOUT, headers=HEADERS, stream=True) as r:
                location = r.headers.get("location") if r.is_redirect else None
        except requests.RequestException:
            location = None
        if not location:
            break
        current = urljoin(current, location)
        hops += 1
    return {"short_host": first, "destination": None, "hops": hops}
