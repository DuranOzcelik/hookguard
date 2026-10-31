"""
HookGuard - what the API knows before any lookup

Loaded once at startup:
- USOM: the domains and IP addresses in data/usom_seen.csv, every category.
- Official domains of known brands: official.py and data/tr_brands.csv,
  minus hosts where users publish their own content (amazonaws.com, googleusercontent.com).
- Tranco ranks, if external/tranco/top-1m.csv.zip is present.
- Shared hosts, where anyone can get a subdomain: the shared platforms in hints.py,
  the user-content hosts, and every popular domain under which USOM has listed a subdomain.
  The last group is mostly dynamic DNS and hosting (ddns.net, wordpress.com, eu.com) that no
  hand-made list keeps up with. A popular parent says nothing about such a subdomain, and the
  parent's registration date is not the subdomain's.
- The stage 1 lexical model, if external/stage1.joblib is present.
- Reviewed user reports (data/community_blocklist.csv, see reports.py): scams join the
  USOM names, betting and adult sites become category overrides.
- TEST_ENTRIES: made-up names that are always on the known-threat list, so that anyone can
  see a known scam stopped, as antivirus test files do. They end in the reserved .example,
  so they can never be real sites.
"""

from __future__ import annotations

import csv
import hashlib
import io
import logging
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .domains import HASH_HEX, host_hash, is_ip, parents
from .hints import SHARED_PLATFORMS, chosen_part
from .model import MODEL_PATH, load as load_model
from .official import OFFICIAL_DOMAINS, OFFICIAL_TLDS

ROOT = Path(__file__).resolve().parent.parent
USOM_CSV = Path("data") / "usom_seen.csv"
BRANDS_CSV = Path("data") / "tr_brands.csv"
COMMUNITY_CSV = Path("data") / "community_blocklist.csv"
TRANCO_ZIP = Path("external") / "tranco" / "top-1m.csv.zip"

# On the known-threat list on purpose, for trying HookGuard (README, the web page's examples).
TEST_ENTRIES = ("dhl-parcel-redelivery.example", "paypal-account-verify.example")

TRANCO_TOP = 100_000  # ranks kept for the popularity check
ALLOW_TOP = 10_000    # popular domains the extension need not ask about
USER_CONTENT = {
    "amazonaws.com", "amazonaws.com.cn", "amazonwebservices.com.cn", "amazonaws.eu", "amazonwebservices.eu",
    "amazon.dev", "googleusercontent.com", "googleapis.com", "sharepoint.com", "onedrive.com",
}

log = logging.getLogger("hookguard.api")


@dataclass(frozen=True)
class UsomEntry:
    usom_id: str
    entry: str
    listed_utc: str
    category: str


def hash_list(names: Iterable[str]) -> dict:
    hashes = sorted({host_hash(n) for n in names})
    version = hashlib.sha256("".join(hashes).encode()).hexdigest()[:16]
    return {"version": version, "algorithm": "sha256", "hex_chars": HASH_HEX, "count": len(hashes), "hashes": hashes}


class References:
    def __init__(self, usom: dict[str, UsomEntry], official: dict[str, str], ranks: dict[str, int],
                 shared_hosts: set[str], model=None, categories: dict[str, str] | None = None):
        self.usom = usom
        self.official = official
        self.ranks = ranks
        self.shared_hosts = shared_hosts
        self.model = model
        self.categories = categories or {}  # reviewed reports: domain -> gambling | adult
        self._blocklist: dict | None = None
        self._allowlist: dict | None = None

    @classmethod
    def load(cls, root: Path = ROOT) -> References:
        usom = read_usom(root / USOM_CSV)
        for name in TEST_ENTRIES:
            usom.setdefault(name, UsomEntry("test", name, "", "PH"))
        categories = read_community(root / COMMUNITY_CSV, usom)
        official = {d: d for d in OFFICIAL_DOMAINS if d not in USER_CONTENT}
        brands = root / BRANDS_CSV
        if brands.exists():
            with brands.open(newline="", encoding="utf-8") as f:
                for b in csv.DictReader(f):
                    for d in filter(None, b["domains"].split(";")):
                        official[d] = b["name"]
        # Popular parents of USOM-listed subdomains are shared hosts; collect the candidates first.
        candidates: set[str] = set()
        for name in usom:
            if not is_ip(name) and chosen_part(name) == name:
                candidates.update(parents(name)[1:])
        ranks, abused = read_tranco(root / TRANCO_ZIP, candidates)
        model_path = root / MODEL_PATH
        model = load_model(model_path)
        if model is None:
            log.warning("No stage 1 model at %s - scores use USOM, DNS and WHOIS only", model_path)
        log.info("USOM %d names, %d official domains, %d ranked, %d abused shared hosts",
                 len(usom), len(official), len(ranks), len(abused))
        return cls(usom, official, ranks, SHARED_PLATFORMS | USER_CONTENT | abused, model, categories)

    def usom_match(self, host: str) -> UsomEntry | None:
        """The USOM entry for the host or its closest listed parent."""
        for name in parents(host):
            if name in self.usom:
                return self.usom[name]
        return None

    def official_brand(self, host: str) -> str | None:
        if host.rsplit(".", 1)[-1] in OFFICIAL_TLDS:
            return host
        for name in parents(host):
            if name in USER_CONTENT:
                return None
            if name in self.official:
                return self.official[name]
        return None

    def shared_host(self, host: str) -> str | None:
        """The shared host this name is a subdomain of: 'x.ddns.net' -> 'ddns.net'."""
        for name in parents(host)[1:]:
            if name in self.shared_hosts:
                return name
        return None

    def model_score(self, host: str) -> float | None:
        if self.model is None or is_ip(host):
            return None
        name = host[4:] if host.startswith("www.") else host  # USOM rarely lists the www. form
        return float(self.model.score([name])[0])

    @property
    def threshold(self) -> float | None:
        return float(self.model.threshold) if self.model is not None else None

    def blocklist(self) -> dict:
        """Hashes of every name USOM lists; the extension checks a host and its parents."""
        if self._blocklist is None:
            self._blocklist = hash_list(self.usom)
            self._blocklist["latest_listed_utc"] = max((e.listed_utc for e in self.usom.values()), default="")
        return self._blocklist

    def allowlist(self) -> dict:
        """Hashes of official and very popular domains, which the extension does not send to the API.

        Betting and adult sites are left out even when popular (several illegal betting
        brands are), so that the extension asks about them and can apply its category rules.
        """
        if self._allowlist is None:
            from .categories import LEGAL_BETTING, guess
            from .scoring import Facts

            names = set(self.official) | {d for d, r in self.ranks.items() if r <= ALLOW_TOP}
            names -= self.shared_hosts
            names -= set(self.usom)
            names = {n for n in names if (guess(n, self, Facts()) or ("",))[0] not in ("gambling", "adult")}
            self._allowlist = hash_list(names | LEGAL_BETTING)
        return self._allowlist


def read_usom(path: Path) -> dict[str, UsomEntry]:
    """Domain and IP entries by name. URL entries are left out: one listed page does not condemn its host."""
    usom: dict[str, UsomEntry] = {}
    if not path.exists():
        log.warning("No USOM data at %s", path)
        return usom
    with path.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["kind"] not in ("domain", "ip"):
                continue
            entry = UsomEntry(r["usom_id"], r["entry"], r["usom_listed_utc"], r["category"])
            usom.setdefault(r["entry"], entry)
            if r["entry"].startswith("www."):
                usom.setdefault(r["entry"][4:], entry)
    return usom


def read_community(path: Path, usom: dict[str, UsomEntry]) -> dict[str, str]:
    """Reviewed reports: scams are added to the USOM names, betting and adult sites returned as categories."""
    categories: dict[str, str] = {}
    if not path.exists():
        return categories
    with path.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["category"] in ("gambling", "adult"):
                categories[r["domain"]] = r["category"]
            else:
                usom.setdefault(r["domain"], UsomEntry("community", r["domain"], r["approved_utc"], "PH"))
    return categories


def read_tranco(path: Path, candidates: set[str]) -> tuple[dict[str, int], set[str]]:
    """Ranks of the top TRANCO_TOP domains, and which candidates appear anywhere in the list."""
    ranks: dict[str, int] = {}
    found: set[str] = set()
    if not path.exists():
        log.warning("No Tranco list at %s - popularity is not used", path)
        return ranks, found
    with zipfile.ZipFile(path) as z:
        with z.open(z.namelist()[0]) as raw:
            for line in io.TextIOWrapper(raw, encoding="utf-8"):
                rank, _, domain = line.strip().partition(",")
                if int(rank) <= TRANCO_TOP:
                    ranks[domain] = int(rank)
                if domain in candidates:
                    found.add(domain)
    return ranks, found
