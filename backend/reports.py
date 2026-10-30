"""
HookGuard - user reports

"Report a suspicious site" (web page and extension) appends the domain, a category
and an optional note to reports/reports.csv. No address, IP or browser detail of the
reporter is kept. Reports never reach users unreviewed: anyone could report a
competitor, so each one waits until it is approved here, which moves it to
data/community_blocklist.csv. The API picks that file up on its next start: scams
join the known-threat list, betting and adult sites become category overrides.

Usage:
    python -m backend.reports list              # pending reports, most reported first
    python -m backend.reports approve DOMAIN [--category phishing]
    python -m backend.reports reject DOMAIN
"""

from __future__ import annotations

import argparse
import csv
import sys
import threading
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from .references import COMMUNITY_CSV, ROOT

REPORTS_CSV = Path("reports") / "reports.csv"  # not committed: unreviewed user input
REPORT_FIELDS = ["received_utc", "domain", "category", "note", "source", "status"]
COMMUNITY_FIELDS = ["domain", "category", "approved_utc", "reports"]
CATEGORIES = ("phishing", "gambling", "investment", "shopping", "tech_support", "adult", "false_positive", "other")

_lock = threading.Lock()


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def save_report(domain: str, category: str, note: str, source: str, root: Path = ROOT) -> None:
    path = root / REPORTS_CSV
    with _lock:
        path.parent.mkdir(exist_ok=True)
        new = not path.exists()
        with path.open("a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=REPORT_FIELDS)
            if new:
                writer.writeheader()
            writer.writerow({"received_utc": utc_now(), "domain": domain, "category": category,
                             "note": " ".join(note.split())[:280], "source": source, "status": "pending"})


def _read(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _write(path: Path, fields: list[str], rows: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def decide(domain: str, approve: bool, category: str | None, root: Path = ROOT) -> int:
    """Marks every pending report of the domain; an approval adds it to the community list."""
    reports = _read(root / REPORTS_CSV)
    mine = [r for r in reports if r["domain"] == domain and r["status"] == "pending"]
    if not mine:
        return 0
    for r in mine:
        r["status"] = "approved" if approve else "rejected"
    _write(root / REPORTS_CSV, REPORT_FIELDS, reports)
    if approve:
        votes = Counter(r["category"] for r in mine if r["category"] not in ("false_positive", "other"))
        chosen = category or (votes.most_common(1)[0][0] if votes else "phishing")
        community = [r for r in _read(root / COMMUNITY_CSV) if r["domain"] != domain]
        community.append({"domain": domain, "category": chosen, "approved_utc": utc_now(), "reports": len(mine)})
        _write(root / COMMUNITY_CSV, COMMUNITY_FIELDS, community)
    return len(mine)


def main() -> int:
    parser = argparse.ArgumentParser(description="Review user reports")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("list")
    approve = sub.add_parser("approve")
    approve.add_argument("domain")
    approve.add_argument("--category", choices=CATEGORIES[:6])
    reject = sub.add_parser("reject")
    reject.add_argument("domain")
    args = parser.parse_args()

    if args.command == "list":
        pending = [r for r in _read(ROOT / REPORTS_CSV) if r["status"] == "pending"]
        counts = Counter(r["domain"] for r in pending)
        for domain, n in counts.most_common():
            cats = Counter(r["category"] for r in pending if r["domain"] == domain)
            notes = [r["note"] for r in pending if r["domain"] == domain and r["note"]][:2]
            print(f"{n:4}  {domain:40} {dict(cats)}  {' | '.join(notes)[:80]}")
        print(f"{len(pending)} pending reports on {len(counts)} domains")
        return 0
    n = decide(args.domain, args.command == "approve", getattr(args, "category", None))
    print(f"{args.command}d {n} report(s) of {args.domain}" if n else f"No pending reports of {args.domain}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
