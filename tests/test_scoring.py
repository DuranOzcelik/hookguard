from datetime import datetime, timezone

from backend.scoring import Facts, assess, model_points

NOW = datetime(2026, 10, 30, tzinfo=timezone.utc)
OK_DNS = {"status": "ok", "addresses": ["192.0.2.10"]}


def facts(registered: str | None = None, dns: dict | None = None) -> Facts:
    return Facts(dns=dns or OK_DNS, registration={"registered_utc": registered, "source": "rdap" if registered else None},
                 now=NOW)


def codes(result: dict) -> list[str]:
    return [r["code"] for r in result["reasons"]]


def test_model_points_bands():
    assert model_points(0.1, 0.928) == 0
    assert 0 < model_points(0.68, 0.928) < 40
    assert model_points(0.928, 0.928) == 50
    assert model_points(1.0, 0.928) == 60


def test_usom_listed_domain_is_high(refs):
    r = assess("a101-hediye.xyz", refs, facts())
    assert r["score"] >= 95 and r["level"] == "high"
    assert r["reasons"][0]["code"] == "usom_listed"
    assert r["reasons"][0]["text"] == "Bu adres, bilinen dolandırıcılık siteleri listesinde yer alıyor."
    assert r["details"]["usom"]["category"] == "PH"


def test_www_of_a_listed_domain_counts_as_listed(refs):
    assert assess("www.a101-hediye.xyz", refs, facts())["reasons"][0]["code"] == "usom_listed"


def test_subdomain_of_listed_domain_is_high(refs):
    r = assess("odeme.kampanya-ptt.com", refs, facts())
    assert r["score"] >= 90 and "usom_parent" in codes(r)


def test_resolving_to_listed_ip_is_high(refs):
    r = assess("yeni-alan.com", refs, facts("2025-01-01T00:00:00Z", {"status": "ok", "addresses": ["198.51.100.7"]}))
    assert r["score"] >= 85 and "usom_ip" in codes(r)


def test_official_domain_is_low_even_with_brand_words(refs):
    r = assess("giris.akbank.com.tr", refs, facts("1996-12-09T00:00:00Z"))
    assert r["score"] <= 5 and r["level"] == "low"
    assert "official" in codes(r) and "brand" not in codes(r)


def test_popular_site_is_capped_and_model_is_not_shown(refs):
    r = assess("wikipedia.org", refs, facts("2001-01-13T00:00:00Z"))
    assert r["score"] <= 15 and "popular" in codes(r)
    assert not any(c.startswith("model") for c in codes(r))


def test_flagged_name_on_a_new_domain_is_high(refs):
    r = assess("garanti-bonus.com", refs, facts("2026-10-27T00:00:00Z"))
    assert r["level"] == "high"
    assert {"model_high", "brand", "age_new"} <= set(codes(r))


def test_flagged_name_on_an_old_domain_is_medium(refs):
    r = assess("garanti-bonus.com", refs, facts("2015-05-01T00:00:00Z"))
    assert r["level"] == "medium" and "age_old" in codes(r)


def test_ordinary_old_domain_is_low(refs):
    r = assess("benimblogum.com", refs, facts("2019-03-01T00:00:00Z"))
    assert r["level"] == "low"


def test_shared_host_subdomain_skips_age_and_popularity(refs):
    r = assess("ptt-kargo.web.app", refs, Facts(dns=OK_DNS, registration=None, now=NOW))
    assert "shared_host" in codes(r) and "popular_parent" not in codes(r)
    assert not any(c.startswith("age") for c in codes(r))
    assert r["details"]["shared_host"] == "web.app"


def test_subdomain_of_popular_site_gets_a_discount(refs):
    r = assess("blog.example-news.com", refs, facts("2010-01-01T00:00:00Z"))
    assert "popular_parent" in codes(r) and r["level"] == "low"


def test_bare_ip_and_missing_dns(refs):
    assert "ip_host" in codes(assess("203.0.113.9", refs, Facts(now=NOW)))
    r = assess("yok-boyle-bir-alan.com", refs, facts(dns={"status": "nxdomain", "addresses": []}))
    assert "dns_nxdomain" in codes(r)


def test_unknown_registration_date_is_reported(refs):
    assert "age_unknown" in codes(assess("benimblogum.com", refs, facts(None)))


def test_reason_points_explain_the_score(refs):
    r = assess("garanti-bonus.com", refs, facts("2026-10-27T00:00:00Z"))
    assert sum(x["points"] for x in r["reasons"]) == r["score"]


def test_english_texts(refs):
    r = assess("a101-hediye.xyz", refs, facts(), lang="en")
    assert r["reasons"][0]["text"].startswith("This address is on a list of known scam sites")


def test_user_facing_texts_name_no_sources_or_techniques(refs):
    hosts = ["a101-hediye.xyz", "odeme.kampanya-ptt.com", "garanti-bonus.com", "wikipedia.org", "ptt-kargo.web.app",
             "203.0.113.9", "giris.akbank.com.tr", "blog.example-news.com"]
    for lang in ("tr", "en"):
        for host in hosts:
            for registered in ("2026-10-27T00:00:00Z", "2026-06-01T00:00:00Z", "2001-01-01T00:00:00Z", None):
                for reason in assess(host, refs, facts(registered), lang=lang)["reasons"]:
                    for word in ("USOM", "Tranco", "model", "DNS", "WHOIS", "IP adres"):
                        assert word not in reason["text"], (host, reason["text"])


def test_dates_are_written_out(refs):
    r = assess("garanti-bonus.com", refs, facts("2026-10-27T00:00:00Z"))
    assert "27 Ekim 2026" in next(x["text"] for x in r["reasons"] if x["code"] == "age_new")
