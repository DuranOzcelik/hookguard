"""
HookGuard - train the stage 1 model

Positives are USOM phishing domains (data/usom_seen.csv, categories PH and BP).
Negatives are random domains from fresh TLS certificates (data/ct_random.csv) plus
the brands' own domains and their usual subdomains, so that akbank.com.tr itself is
not flagged. The newest 20% of USOM entries are held out for the test, and recall is
reported at fixed false-positive rates. The saved threshold is the one that gives a
0.1% false-positive rate on the test set; the saved model is then trained on all data.

Usage (from the repository root):
    python -m tools.train_model                     # train, evaluate, save external/stage1.joblib
    python -m tools.train_model --score a.com b.com # score names with the saved model
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import roc_auc_score, roc_curve

from backend.hints import brand_hint, chosen_part
from backend.model import MODEL_PATH, Stage1, load
from backend.official import OFFICIAL_DOMAINS, is_official

DATA_DIR = Path("data")
TEST_SHARE = 0.2
FPR_POINTS = (0.01, 0.001)
OPERATING_FPR = 0.001  # new domains arrive by the million every day; only a very low FPR is usable
OFFICIAL_SUBDOMAINS = ("", "www.", "m.", "mobil.", "internet.", "online.", "giris.", "login.", "api.",
                       "mail.", "kampanya.", "destek.", "subeler.")


def read_rows(path: Path, keep=lambda r: True) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as f:
        return [r for r in csv.DictReader(f) if keep(r)]


def recall_at(y, s, fpr_target):
    fpr, tpr, thr = roc_curve(y, s)
    i = np.searchsorted(fpr, fpr_target, side="right") - 1
    return tpr[i], thr[i]


def score(names: list[str]) -> int:
    model = load()
    if model is None:
        sys.exit(f"No model at {MODEL_PATH}; train it first with: python -m tools.train_model")
    for d, s in zip(names, model.score(names)):
        flag = "official" if is_official(d) else ("ALERT" if s >= model.threshold else "")
        print(f"{s:.3f}  {flag:8}  {d}")
    return 0


def train() -> int:
    usom = read_rows(DATA_DIR / "usom_seen.csv", lambda r: r["category"] in ("PH", "BP") and r["kind"] in ("domain", "url"))
    usom.sort(key=lambda r: int(r["usom_id"]))
    pos = [d for d in dict.fromkeys(r["entry"].split("/", 1)[0].lower() for r in usom) if not is_official(d)]
    neg = [r["domain"] for r in read_rows(DATA_DIR / "ct_random.csv")]
    neg += [sub + d for d in sorted(OFFICIAL_DOMAINS) for sub in OFFICIAL_SUBDOMAINS]
    rng = np.random.default_rng(0)
    neg = list(dict.fromkeys(rng.permutation(neg)))

    cut_p, cut_n = int(len(pos) * (1 - TEST_SHARE)), int(len(neg) * (1 - TEST_SHARE))
    train_names = pos[:cut_p] + neg[:cut_n]
    y_train = [1] * cut_p + [0] * cut_n
    test = pos[cut_p:] + neg[cut_n:]
    y_test = np.array([1] * (len(pos) - cut_p) + [0] * (len(neg) - cut_n))

    model = Stage1().fit(train_names, y_train)
    s = model.score(test)
    hint = np.array([int(bool(brand_hint(d))) for d in test])

    print(f"positives {len(pos)} (test {len(pos) - cut_p}, newest), negatives {len(neg)} (test {len(neg) - cut_n})")
    print(f"ROC AUC: {roc_auc_score(y_test, s):.4f}")
    print(f"brand hint alone: recall {hint[y_test == 1].mean():.1%}  FPR {hint[y_test == 0].mean():.2%}")
    for f in FPR_POINTS:
        r, t = recall_at(y_test, s, f)
        print(f"model at FPR {f:.1%}: recall {r:.1%}  (threshold {t:.3f})")
    t = recall_at(y_test, s, OPERATING_FPR)[1]
    shared = np.array([chosen_part(d) != d for d in test])
    for label, mask in (("own domains", ~shared), ("shared platforms", shared)):
        p, n = mask & (y_test == 1), mask & (y_test == 0)
        fpr = (s[n] >= t).mean() if n.any() else 0.0
        print(f"  {label:16} at FPR {OPERATING_FPR:.1%}: recall {(s[p] >= t).mean():.1%} of {p.sum()}, "
              f"false positives {fpr:.2%} of {n.sum()}")

    MODEL_PATH.parent.mkdir(exist_ok=True)
    final = Stage1().fit(pos + neg, [1] * len(pos) + [0] * len(neg))
    final.threshold = float(t)
    joblib.dump(final, MODEL_PATH)
    print(f"Saved {MODEL_PATH} (trained on all data, threshold {final.threshold:.3f} = FPR {OPERATING_FPR:.1%} on test)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Train or try the stage 1 model")
    parser.add_argument("--score", nargs="+", metavar="DOMAIN", help="Score these names with the saved model")
    args = parser.parse_args()
    return score(args.score) if args.score else train()


if __name__ == "__main__":
    sys.exit(main())
