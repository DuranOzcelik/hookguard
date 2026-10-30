"""Small in-memory references and fake lookups, so the tests need no network, data files or model."""

from __future__ import annotations

import pytest

from backend.references import References, UsomEntry


class FakeModel:
    threshold = 0.928

    def __init__(self, scores: dict[str, float]):
        self.scores = scores

    def score(self, names):
        return [self.scores.get(n, 0.05) for n in names]


class FakeLookups:
    def __init__(self, dns: dict | None = None, registered: dict | None = None):
        self.dns = dns or {}
        self.registered = registered or {}
        self.resolved: list[str] = []
        self.registrations: list[str] = []

    def resolve(self, host: str) -> dict:
        self.resolved.append(host)
        return self.dns.get(host, {"status": "ok", "addresses": ["192.0.2.10"]})

    def registration(self, domain: str) -> dict:
        self.registrations.append(domain)
        created = self.registered.get(domain)
        return {"registered_utc": created, "source": "rdap" if created else None}


@pytest.fixture
def refs() -> References:
    usom = {
        "a101-hediye.xyz": UsomEntry("1", "a101-hediye.xyz", "2026-10-20T08:00:00Z", "PH"),
        "kampanya-ptt.com": UsomEntry("2", "kampanya-ptt.com", "2026-10-21T08:00:00Z", "BP"),
        "198.51.100.7": UsomEntry("3", "198.51.100.7", "2026-10-22T08:00:00Z", "MC"),
        "garanti-giris.ddns.net": UsomEntry("4", "garanti-giris.ddns.net", "2026-10-23T08:00:00Z", "BP"),
    }
    model = FakeModel({
        "a101-hediye.xyz": 0.995, "garanti-bonus.com": 0.97, "benimblogum.com": 0.68,
        "edevlet-sorgula.com": 0.998, "google.com": 0.48, "ptt-kargo.web.app": 0.96,
    })
    return References(
        usom=usom,
        official={"akbank.com.tr": "Akbank", "google.com": "google.com"},
        ranks={"google.com": 1, "wikipedia.org": 9, "ddns.net": 958, "example-news.com": 4200},
        shared_hosts={"ddns.net", "web.app", "amazonaws.com"},
        model=model,
    )
