from backend.categories import classify, guess
from backend.scoring import Facts

from .test_scoring import NOW, facts


def category(host, refs, registered=None):
    found = guess(host, refs, facts(registered))
    return found[:2] if found else None


def test_illegal_betting_brands_and_numbered_mirrors(refs):
    assert category("casibom845.com", refs) == ("gambling", "high")
    assert category("www.jojobet1023.com", refs) == ("gambling", "high")
    assert category("betcio846.com", refs) == ("gambling", "high")
    assert category("canlibahis-giris.net", refs) == ("gambling", "high")
    assert category("bahisrehberi.com", refs) == ("gambling", "medium")


def test_legal_betting_and_ordinary_words_are_not_flagged(refs):
    for host in ("nesine.com", "www.bilyoner.com", "iddaa.com", "misli.com", "tjk.org",
                 "alphabet.com", "better.com", "bethesda.net", "tibet.org", "sussex.ac.uk", "essex.gov.uk"):
        assert category(host, refs) is None, host


def test_adult_sites_for_family_mode(refs):
    assert category("free-xxx-videos.com", refs) == ("adult", "high")
    assert category("sexshop-ornek.com", refs) == ("adult", "high")


def test_investment_needs_a_new_or_unknown_site(refs):
    assert category("kripto-kazanc-pro.com", refs) == ("investment", "medium")
    assert category("kripto-kazanc-pro.com", refs, "2015-01-01T00:00:00Z") is None


def test_shopping_needs_a_new_site(refs):
    assert category("buyuk-indirim-magaza.com", refs, "2026-10-20T00:00:00Z") == ("shopping", "medium")
    assert category("buyuk-indirim-magaza.com", refs, "2018-01-01T00:00:00Z") is None
    assert category("buyuk-indirim-magaza.com", refs, None) is None


def test_trusted_sites_get_no_category(refs):
    assert category("giris.akbank.com.tr", refs) is None
    assert category("google.com", refs) is None


def test_reviewed_reports_override(refs):
    refs.categories["bahis-ornek.example"] = "gambling"
    assert category("m.bahis-ornek.example", refs) == ("gambling", "high")


def test_classify_texts(refs):
    c = classify("casibom845.com", refs, Facts(now=NOW))
    assert c["id"] == "gambling" and c["label"] == "Yasadışı bahis sitesi" and c["reasons"]
    assert classify("casibom845.com", refs, Facts(now=NOW), "en")["label"] == "Illegal betting site"


def test_allowlist_leaves_out_betting_and_adult(refs):
    from backend.domains import host_hash

    refs.ranks.update({"casibom.com": 900, "pornhub.com": 50, "nesine.com": 3000})
    hashes = set(refs.allowlist()["hashes"])
    assert host_hash("casibom.com") not in hashes and host_hash("pornhub.com") not in hashes
    assert host_hash("nesine.com") in hashes
