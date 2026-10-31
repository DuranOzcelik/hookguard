"""
HookGuard - data for checks on the device

The web page on GitHub Pages and the browser extension check names in the browser,
without the API. This writes what they need, built from the same references the API
loads, into web/public/data and extension/public/data:

- engine.json     the stage 1 model (n-grams, idf, weights), the name hints, official
                  domains, shared hosts and the category word lists (shared/engine/)
- blocklist.json  hashes of the names USOM lists, as /api/blocklist, plus the category of
                  the entries that are not scams (malware, attack sources)
- allowlist.json  hashes of official and very popular domains, as /api/allowlist

The browser cannot look up DNS or registration dates, so checks there use the name and
the lists only. With --parity, cases scored by the Python code are written as well, so
that the TypeScript port can be tested against them (web/src/engine.parity.test.ts).

Usage (from the repository root, after python -m tools.train_model):
    python -m tools.build_static
    python -m tools.build_static --parity build/parity.json
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from pathlib import Path

from backend.categories import (ADULT_SUBSTRINGS, ADULT_TOKENS, GAMBLING_HINTS, GAMBLING_WORDS,
                                ILLEGAL_BETTING_BRANDS, INVESTMENT_WORDS, LEGAL_BETTING, SHOPPING_WORDS, classify)
from backend.domains import SECOND_LEVEL, host_hash, parents
from backend.hints import BRAND_HINTS, LURE_HINTS, SHARED_PLATFORMS
from backend.official import OFFICIAL_TLDS
from backend.references import USER_CONTENT, References
from backend.scoring import Facts, assess

OUT_DIRS = (Path("web") / "public" / "data", Path("extension") / "public" / "data")
SCAM_CATEGORIES = ("PH", "BP")
NGRAM_RANGE = (2, 5)


def sig(x: float, digits: int = 6) -> float:
    return float(f"{x:.{digits}g}")


def export_model(model) -> dict | None:
    if model is None:
        return None
    vec, clf = model.vec, model.clf
    assert (vec.analyzer, vec.ngram_range, vec.sublinear_tf, vec.norm) == ("char", NGRAM_RANGE, True, "l2")
    vocab = sorted(vec.vocabulary_.items(), key=lambda kv: kv[1])
    coef = clf.coef_[0]
    n = len(vocab)
    return {
        "ngram_range": list(NGRAM_RANGE),
        "ngrams": [g for g, _ in vocab],
        "idf": [sig(x) for x in vec.idf_],
        "coef": [sig(x) for x in coef[:n]],
        "extra": [sig(x) for x in coef[n:]],
        "intercept": sig(float(clf.intercept_[0])),
        "threshold": sig(float(model.threshold)),
    }


def engine_data(refs: References) -> dict:
    return {
        "model": export_model(refs.model),
        "brands": [[name, words] for name, words in BRAND_HINTS.items()],
        "lures": [[name, words] for name, words in LURE_HINTS.items()],
        "shared_platforms": sorted(SHARED_PLATFORMS),
        "shared_hosts": sorted(refs.shared_hosts),
        "user_content": sorted(USER_CONTENT),
        "official": dict(sorted(refs.official.items())),
        "official_tlds": sorted(OFFICIAL_TLDS),
        "second_level": sorted(SECOND_LEVEL),
        "categories": {
            "legal_betting": sorted(LEGAL_BETTING),
            "illegal_betting_brands": list(ILLEGAL_BETTING_BRANDS),
            "gambling_words": list(GAMBLING_WORDS),
            "gambling_hints": list(GAMBLING_HINTS),
            "investment_words": list(INVESTMENT_WORDS),
            "shopping_words": list(SHOPPING_WORDS),
            "adult_substrings": list(ADULT_SUBSTRINGS),
            "adult_tokens": sorted(ADULT_TOKENS),
            "community": dict(sorted(refs.categories.items())),
        },
    }


def blocklist(refs: References) -> dict:
    data = dict(refs.blocklist())
    data["categories"] = {host_hash(name): e.category for name, e in sorted(refs.usom.items())
                          if e.category not in SCAM_CATEGORIES}
    return data


def with_version(data: dict) -> dict:
    body = json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return {"version": hashlib.sha256(body.encode()).hexdigest()[:16], **data}


def parity_cases(refs: References) -> list[dict]:
    """Names scored by the Python code, for the TypeScript port's test. Facts are empty, as in the browser."""
    names = ["a101-hediye.xyz", "ptt-kargo-odeme.com", "www.edevlet-giris-sorgu.net", "giris.akbank.com.tr",
             "turkiye.gov.tr", "cloud-dario.duckdns.org", "trendyol-kampanya.web.app", "185.12.34.56",
             "bets10giris845.com", "casino-bonus.net", "kripto-kazanc.org", "outlet-magaza.shop", "xnxx-tr.net",
             "nesine.com", "my-shop.myshopify.com", "example-bakery.com", "a1o1halftan.com", "b12aa101b5.com",
             "secure-paypal-login.info", "mail.google.com", "sub.example.co.uk", "iddaa.com"]
    with open("data/ct_random.csv", newline="", encoding="utf-8") as f:
        names += [r["domain"] for _, r in zip(range(150), csv.DictReader(f))]
    usom = [n for n in refs.usom if not n.replace(".", "").isdigit()]
    names += usom[:: max(1, len(usom) // 150)]
    names += ["login." + n for n in usom[:20]]
    allowed = set(refs.allowlist()["hashes"])
    cases = []
    for host in dict.fromkeys(names):
        # The browser knows popular sites from the allowlist only (top 10,000, no betting or adult sites):
        # skip names whose score depends on a rank it cannot see.
        if refs.shared_host(host) is None and any(p in refs.ranks and host_hash(p) not in allowed for p in parents(host)):
            continue
        for lang in ("en", "tr"):
            result = assess(host, refs, Facts(), lang)
            result["category"] = classify(host, refs, Facts(), lang)
            cases.append({"host": host, "lang": lang, "score": result["score"], "level": result["level"],
                          "model_score": result["details"]["model_score"], "reasons": result["reasons"],
                          "category": result["category"]})
    return cases


def write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{path}  {path.stat().st_size / 1024:,.0f} KB")


def main() -> int:
    parser = argparse.ArgumentParser(description="Write the data for checks in the browser")
    parser.add_argument("--parity", type=Path, metavar="FILE", help="Also write Python-scored test cases here")
    args = parser.parse_args()

    refs = References.load()
    if refs.model is None:
        print("No stage 1 model: train it first with python -m tools.train_model", file=sys.stderr)
    if not refs.ranks:
        print("No Tranco list: the allowlist has official domains only", file=sys.stderr)
    files = {"engine.json": with_version(engine_data(refs)), "blocklist.json": blocklist(refs),
             "allowlist.json": refs.allowlist()}
    for out in OUT_DIRS:
        for name, data in files.items():
            write(out / name, data)
    if args.parity:
        write(args.parity, parity_cases(refs))
    return 0


if __name__ == "__main__":
    sys.exit(main())
