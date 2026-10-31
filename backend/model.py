"""
HookGuard - stage 1 lexical model

Scores a domain name alone, before anything is visited: character 2-5 grams of the
name plus its length, digits, hyphens, entropy and the brand and lure hints, in a
logistic regression. On shared platforms (duckdns.org, web.app, ...) only the part the
owner chose is scored, as if it were a .com domain: "cloud-dario.duckdns.org" is seen
as "cloud-dario.com", so the platform's name cannot decide the score.

Train it with `python -m tools.train_model`; the API loads external/stage1.joblib.
"""

from __future__ import annotations

import math
from pathlib import Path

import joblib
import numpy as np
from scipy.sparse import csr_matrix, hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

from .hints import brand_hint, chosen_part, lure_hint

MODEL_PATH = Path("external") / "stage1.joblib"


def model_view(domain: str) -> str:
    """The name the model scores: shared-platform names become '<chosen part>.com'."""
    part = chosen_part(domain)
    return domain if part == domain else part + ".com"


def entropy(s: str) -> float:
    counts = [s.count(c) for c in set(s)]
    return -sum(c / len(s) * math.log2(c / len(s)) for c in counts)


def extra_features(domains: list[str]) -> csr_matrix:
    rows = []
    for d in domains:
        labels = d.split(".")
        rows.append([
            len(d) / 50, len(labels) / 5, sum(ch.isdigit() for ch in d) / 10, d.count("-") / 5,
            entropy(d) / 5, int(bool(brand_hint(d))), int(bool(lure_hint(d))),
        ])
    return csr_matrix(np.array(rows))


class Stage1:
    def __init__(self):
        self.vec = TfidfVectorizer(analyzer="char", ngram_range=(2, 5), min_df=2, sublinear_tf=True,
                                   max_features=50_000)
        self.clf = LogisticRegression(C=4, max_iter=2000, class_weight="balanced")
        self.threshold = 0.5

    def _x(self, domains, fit=False):
        names = [model_view(d) for d in domains]
        text = self.vec.fit_transform(names) if fit else self.vec.transform(names)
        return hstack([text, extra_features(names)]).tocsr()

    def fit(self, domains, y):
        self.clf.fit(self._x(domains, fit=True), y)
        return self

    def score(self, domains) -> np.ndarray:
        return self.clf.predict_proba(self._x(domains))[:, 1]


def load(path: Path = MODEL_PATH) -> Stage1 | None:
    return joblib.load(path) if path.exists() else None
