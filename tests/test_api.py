import hashlib

import pytest
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.references import TEST_ENTRIES, References
from tests.conftest import FakeLookups


def h(host: str) -> str:
    return hashlib.sha256(host.encode()).hexdigest()[:16]


@pytest.fixture
def lookups():
    return FakeLookups(registered={"garanti-bonus.com": "2026-10-27T00:00:00Z"})


@pytest.fixture
def client(refs, lookups, tmp_path):
    with TestClient(create_app(refs, lookups, rate_limit=5, reports_root=tmp_path, store_path=tmp_path / "links.db")) as c:
        c.reports_root = tmp_path
        yield c


def test_check_scores_a_domain(client):
    r = client.post("/api/check", json={"domain": "garanti-bonus.com"})
    assert r.status_code == 200
    body = r.json()
    assert body["domain"] == "garanti-bonus.com"
    assert 0 <= body["score"] <= 100 and body["level"] == "high"
    assert all({"code", "points", "severity", "text"} <= set(x) for x in body["reasons"])
    assert body["checked_utc"].endswith("Z")


def test_check_cuts_a_link_down_to_its_host(client, lookups):
    r = client.post("/api/check", json={"domain": "https://garanti-bonus.com/giris?tc=12345678901"})
    assert r.json()["domain"] == "garanti-bonus.com"
    assert lookups.resolved == ["garanti-bonus.com"] and lookups.registrations == ["garanti-bonus.com"]


def test_check_looks_up_the_registered_domain_not_the_subdomain(client, lookups):
    client.post("/api/check", json={"domain": "odeme.garanti-bonus.com"})
    assert lookups.resolved == ["odeme.garanti-bonus.com"] and lookups.registrations == ["garanti-bonus.com"]


def test_check_skips_whois_on_shared_hosts(client, lookups):
    client.post("/api/check", json={"domain": "ptt-kargo.web.app"})
    assert lookups.registrations == []


def test_check_rejects_non_domains(client):
    assert client.post("/api/check", json={"domain": "not a domain"}).status_code == 422
    assert client.post("/api/check", json={}).status_code == 422
    assert client.post("/api/check", json={"domain": "a.com", "lang": "de"}).status_code == 422


def test_check_in_english(client):
    r = client.post("/api/check", json={"domain": "a101-hediye.xyz", "lang": "en"}).json()
    assert r["reasons"][0]["text"].startswith("This address is on a list")


def test_rate_limit(client):
    codes = [client.post("/api/check", json={"domain": "benimblogum.com"}).status_code for _ in range(6)]
    assert codes[:5] == [200] * 5 and codes[5] == 429


def test_blocklist_hashes_usom_names(client):
    r = client.get("/api/blocklist")
    body = r.json()
    assert body["algorithm"] == "sha256" and body["hex_chars"] == 16
    assert h("a101-hediye.xyz") in body["hashes"] and h("198.51.100.7") in body["hashes"]
    assert h("akbank.com.tr") not in body["hashes"]
    assert body["count"] == len(body["hashes"]) == 4
    assert "a101-hediye.xyz" not in r.text  # only hashes, no names


def test_blocklist_etag(client):
    etag = client.get("/api/blocklist").headers["etag"]
    r = client.get("/api/blocklist", headers={"If-None-Match": etag})
    assert r.status_code == 304


def test_allowlist_leaves_out_shared_hosts_and_usom(client):
    hashes = client.get("/api/allowlist").json()["hashes"]
    assert h("akbank.com.tr") in hashes and h("google.com") in hashes and h("wikipedia.org") in hashes
    assert h("ddns.net") not in hashes and h("a101-hediye.xyz") not in hashes


def test_cors_allows_the_extension(client):
    r = client.options("/api/check", headers={"Origin": "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
                                              "Access-Control-Request-Method": "POST"})
    assert r.headers.get("access-control-allow-origin") == "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
    r = client.options("/api/check", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in r.headers


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok" and body["usom_names"] == 4 and body["model"] is True


def test_check_returns_a_category(client):
    assert client.post("/api/check", json={"domain": "casibom845.com"}).json()["category"]["id"] == "gambling"
    assert client.post("/api/check", json={"domain": "benimblogum.com"}).json()["category"] is None


def test_report_is_stored_without_reporter_details(client):
    r = client.post("/api/report", json={"domain": "https://sahte-kargo.example/takip?no=5", "category": "phishing",
                                         "note": "SMS ile geldi", "source": "extension"})
    assert r.status_code == 200 and r.json()["domain"] == "sahte-kargo.example"
    text = (client.reports_root / "reports" / "reports.csv").read_text(encoding="utf-8")
    assert "sahte-kargo.example" in text and "takip" not in text and "testclient" not in text
    assert client.post("/api/report", json={"domain": "x.com", "category": "nonsense"}).status_code == 422


def test_expand_only_follows_shorteners(client, monkeypatch):
    from backend import shortlinks

    class Response:
        def __init__(self, location):
            self.headers, self.is_redirect = {"location": location}, True

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    requested = []

    def fake_get(url, **kwargs):
        requested.append(url)
        return Response({"https://bit.ly/abc": "https://tinyurl.com/def",
                         "https://tinyurl.com/def": "https://ptt-kargo-teslimat.example/odeme?id=42"}[url])

    monkeypatch.setattr(shortlinks.requests, "get", fake_get)
    body = client.post("/api/expand", json={"url": "https://bit.ly/abc"}).json()
    assert body == {"short_host": "bit.ly", "destination": "ptt-kargo-teslimat.example", "hops": 2}
    assert requested == ["https://bit.ly/abc", "https://tinyurl.com/def"]  # the destination itself is never requested
    assert client.post("/api/expand", json={"url": "https://evil.example/x"}).status_code == 422


def test_shorten_checks_the_destination_first(client):
    made = client.post("/api/shorten", json={"url": "https://benimblogum.com/yazi/1?x=2"}).json()
    assert made["code"] and made["path"] == f"/s/{made['code']}" and made["destination"] == "benimblogum.com"
    opened = client.get(f"/api/short/{made['code']}").json()
    assert opened["url"] == "https://benimblogum.com/yazi/1?x=2" and opened["result"]["domain"] == "benimblogum.com"


def test_shorten_refuses_dangerous_destinations(client):
    for url in ("https://a101-hediye.xyz/odeme", "casibom845.com"):
        body = client.post("/api/shorten", json={"url": url}).json()
        assert body["code"] is None and body["result"]["domain"] in url


def test_shorten_refuses_short_links_and_non_links(client):
    assert client.post("/api/shorten", json={"url": "https://bit.ly/abc"}).status_code == 422
    assert client.post("/api/shorten", json={"url": "ftp://files.example.com/x"}).status_code == 422
    assert client.get("/api/short/nope").status_code == 404
    assert client.get("/api/short/AbCdEf1").status_code == 404


def test_test_entries_are_always_listed(tmp_path):
    refs = References.load(tmp_path)  # no data at all
    assert all(refs.usom_match(name) for name in TEST_ENTRIES)
    assert all(name.endswith(".example") for name in TEST_ENTRIES)
