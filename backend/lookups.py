"""
HookGuard - live lookups for the API

DNS: the host's A and AAAA records, through the system resolver.
Registration date: RDAP where the registry offers it (IANA's bootstrap file names the
server), otherwise WHOIS on port 43 at the server whois.iana.org refers to. Turkish .tr
domains have no RDAP; TRABIS answers on WHOIS ("Created on..............: 1996-Dec-09.").

Answers are cached in memory only; queried names are never written anywhere.
"""

from __future__ import annotations

import re
import socket
import threading
import time
from collections import OrderedDict
from datetime import datetime, timezone

import dns.exception
import dns.resolver
import requests

RDAP_BOOTSTRAP = "https://data.iana.org/rdap/dns.json"
TIMEOUT = 5
DNS_TTL = 600
AGE_TTL = 6 * 3600

CREATED = re.compile(r"(?im)^\s*(?:creation date|created on|created|registered on|registration date|"
                     r"registration time|registered|record created|domain record activated)\s*[.\s]*:\s*(.+?)\s*$")
DATE_FORMATS = ("%Y-%b-%d", "%d-%b-%Y", "%Y-%m-%d", "%Y.%m.%d", "%d.%m.%Y", "%d/%m/%Y", "%Y/%m/%d", "%Y%m%d",
                "%d-%m-%Y", "%b %d %Y")


class TTLCache:
    def __init__(self, ttl: float, size: int = 10_000):
        self.ttl, self.size = ttl, size
        self.items: OrderedDict[str, tuple[float, object]] = OrderedDict()
        self.lock = threading.Lock()

    def get(self, key: str):
        with self.lock:
            hit = self.items.get(key)
            if hit is None or hit[0] < time.monotonic():
                return None
            self.items.move_to_end(key)
            return hit[1]

    def put(self, key: str, value, ttl: float | None = None) -> None:
        with self.lock:
            self.items[key] = (time.monotonic() + (self.ttl if ttl is None else ttl), value)
            self.items.move_to_end(key)
            while len(self.items) > self.size:
                self.items.popitem(last=False)


def parse_date(value: str) -> datetime | None:
    """'2026-02-05T20:27:25Z', '1996-Dec-09.', '13.07.2001 10:00:00' -> aware UTC datetime."""
    value = value.strip().rstrip(".")
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        pass
    first = value.split()[0] if value else ""
    for candidate in (value, first):
        for fmt in DATE_FORMATS:
            try:
                return datetime.strptime(candidate, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
    return None


def whois_query(server: str, query: str) -> str:
    with socket.create_connection((server, 43), timeout=TIMEOUT) as s:
        s.settimeout(TIMEOUT)
        s.sendall((query + "\r\n").encode("ascii"))
        chunks = []
        while chunk := s.recv(4096):
            chunks.append(chunk)
    raw = b"".join(chunks)
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("iso-8859-9", "replace")  # TRABIS answers in Turkish ISO-8859-9


class Lookups:
    def __init__(self):
        self.dns_cache = TTLCache(DNS_TTL)
        self.age_cache = TTLCache(AGE_TTL)
        self._rdap: dict[str, str] | None = None
        self._whois_servers: dict[str, str | None] = {}
        self.lock = threading.Lock()

    def resolve(self, host: str) -> dict:
        """{'status': ok | nxdomain | no_address | timeout | error, 'addresses': [...]}"""
        cached = self.dns_cache.get(host)
        if cached is not None:
            return cached
        resolver = dns.resolver.Resolver()
        resolver.lifetime = 3
        addresses: list[str] = []
        status = "no_address"
        for rtype in ("A", "AAAA"):
            try:
                addresses += [r.address for r in resolver.resolve(host, rtype)]
            except dns.resolver.NXDOMAIN:
                status = "nxdomain"
                break
            except (dns.resolver.NoAnswer, dns.resolver.NoNameservers):
                continue
            except dns.exception.Timeout:
                status = "timeout"
                break
            except dns.exception.DNSException:
                status = "error"
                break
        if addresses:
            status = "ok"
        result = {"status": status, "addresses": sorted(set(addresses))}
        if status != "timeout":
            self.dns_cache.put(host, result)
        return result

    def registration(self, domain: str) -> dict:
        """{'registered_utc': ISO or None, 'source': rdap | whois | None}"""
        cached = self.age_cache.get(domain)
        if cached is not None:
            return cached
        result = {"registered_utc": None, "source": None}
        for source, lookup in (("rdap", self._rdap_created), ("whois", self._whois_created)):
            try:
                created = lookup(domain)
            except (OSError, requests.RequestException, ValueError):
                created = None
            if created is not None:
                result = {"registered_utc": created.strftime("%Y-%m-%dT%H:%M:%SZ"), "source": source}
                break
        # A failed lookup may have been a timeout, so it is retried sooner.
        self.age_cache.put(domain, result, None if result["source"] else DNS_TTL)
        return result

    def _rdap_base(self, tld: str) -> str | None:
        with self.lock:
            if self._rdap is None:
                services = requests.get(RDAP_BOOTSTRAP, timeout=TIMEOUT).json()["services"]
                self._rdap = {t: urls[0].rstrip("/") + "/" for tlds, urls in services for t in tlds}
        return self._rdap.get(tld)

    def _rdap_created(self, domain: str) -> datetime | None:
        base = self._rdap_base(domain.rsplit(".", 1)[-1])
        if base is None:
            return None
        r = requests.get(f"{base}domain/{domain}", timeout=TIMEOUT, headers={"Accept": "application/rdap+json"})
        if r.status_code != 200:
            return None
        for event in r.json().get("events", []):
            if event.get("eventAction") == "registration":
                return parse_date(event.get("eventDate", ""))
        return None

    def _whois_server(self, tld: str) -> str | None:
        if tld not in self._whois_servers:
            answer = whois_query("whois.iana.org", tld)
            m = re.search(r"(?im)^whois:\s*(\S+)", answer)
            self._whois_servers[tld] = m.group(1) if m else None
        return self._whois_servers[tld]

    def _whois_created(self, domain: str) -> datetime | None:
        server = self._whois_server(domain.rsplit(".", 1)[-1])
        if server is None:
            return None
        for m in CREATED.finditer(whois_query(server, domain)):
            created = parse_date(m.group(1))
            if created is not None:
                return created
        return None
