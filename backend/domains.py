"""
HookGuard - host names

Turns user input (a domain or a pasted link) into a bare host name, finds the
registered domain, and computes the hashes shared with the browser extension.
Only the host is ever kept: paths, query strings and credentials are dropped.
"""

from __future__ import annotations

import hashlib
import ipaddress
import re
from urllib.parse import urlsplit

# Second-level suffixes under which names are registered ("akbank.com.tr", not "com.tr").
# A short list for the countries HookGuard sees most; shared platforms are handled separately.
SECOND_LEVEL = {
    "com.tr", "net.tr", "org.tr", "gov.tr", "edu.tr", "k12.tr", "gen.tr", "biz.tr", "info.tr", "av.tr",
    "dr.tr", "bel.tr", "pol.tr", "tsk.tr", "web.tr", "name.tr", "tel.tr", "bbs.tr", "kep.tr",
    "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "org.au", "co.jp", "co.kr", "com.br",
    "com.cn", "com.mx", "co.in", "co.za", "com.ar", "com.co", "com.ph", "com.pk", "com.ng", "com.sa",
    "com.eg", "co.id", "com.my", "com.sg", "com.vn", "co.nz", "com.ua", "com.az", "com.cy", "co.il",
}
LABEL = re.compile(r"^(?!-)[a-z0-9_-]{1,63}(?<!-)$")
HASH_HEX = 16  # 64-bit prefixes of SHA-256: small lists, collisions negligible at this size


def is_ip(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def normalize_host(raw: str) -> str | None:
    """'https://User@Ödeme-Akbank.com:8443/giris?x=1' -> 'xn--deme-akbank-qfb.com'; None if not a host."""
    text = raw.strip().lower()
    if not text or any(ch.isspace() for ch in text):
        return None
    if "://" not in text:
        text = "http://" + text
    try:
        host = urlsplit(text).hostname
    except ValueError:
        return None
    if not host:
        return None
    host = host.rstrip(".")
    if is_ip(host):
        return host
    try:
        host = host.encode("idna").decode("ascii")
    except UnicodeError:
        return None
    labels = host.split(".")
    if len(labels) < 2 or len(host) > 253 or labels[-1].isdigit() or not all(LABEL.match(x) for x in labels):
        return None
    return host


def registered_domain(host: str) -> str:
    """'giris.akbank.com.tr' -> 'akbank.com.tr'."""
    labels = host.split(".")
    n = 3 if len(labels) >= 3 and ".".join(labels[-2:]) in SECOND_LEVEL else 2
    return ".".join(labels[-n:])


def parents(host: str) -> list[str]:
    """The host and every parent with at least two labels: 'a.b.com' -> ['a.b.com', 'b.com']."""
    if is_ip(host):
        return [host]
    labels = host.split(".")
    return [".".join(labels[i:]) for i in range(len(labels) - 1)]


def host_hash(host: str) -> str:
    return hashlib.sha256(host.encode("ascii")).hexdigest()[:HASH_HEX]
