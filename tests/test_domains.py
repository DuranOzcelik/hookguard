import hashlib

import pytest

from backend.domains import host_hash, normalize_host, parents, registered_domain


@pytest.mark.parametrize("raw, host", [
    ("akbank.com.tr", "akbank.com.tr"),
    ("  AKBANK.com.tr.  ", "akbank.com.tr"),
    ("https://user:pass@Giris.Akbank.com.tr:8443/login?next=/hesap#x", "giris.akbank.com.tr"),
    ("http://a101-hediye.xyz/kampanya/form.php?tc=12345678901", "a101-hediye.xyz"),
    ("ödeme-akbank.com", "xn--deme-akbank-qfb.com"),  # as browsers' URL parser gives it
    ("http://198.51.100.7/panel", "198.51.100.7"),
    ("https://[2001:db8::1]/x", "2001:db8::1"),
])
def test_normalize_keeps_only_the_host(raw, host):
    assert normalize_host(raw) == host


@pytest.mark.parametrize("raw", ["", "   ", "localhost", "not a domain", "-bad-.com", "a..com", "1.2.3", "javascript:alert(1)",
                                 "x" * 64 + ".com"])
def test_normalize_rejects_non_hosts(raw):
    assert normalize_host(raw) is None


def test_registered_domain():
    assert registered_domain("giris.akbank.com.tr") == "akbank.com.tr"
    assert registered_domain("a.b.example.co.uk") == "example.co.uk"
    assert registered_domain("a101-hediye.xyz") == "a101-hediye.xyz"
    assert registered_domain("x.y.garanti-bonus.com") == "garanti-bonus.com"


def test_parents():
    assert parents("a.b.example.com") == ["a.b.example.com", "b.example.com", "example.com"]
    assert parents("198.51.100.7") == ["198.51.100.7"]


def test_host_hash_is_a_sha256_prefix():
    assert host_hash("a101-hediye.xyz") == hashlib.sha256(b"a101-hediye.xyz").hexdigest()[:16]
