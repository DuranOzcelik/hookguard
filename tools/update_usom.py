"""
HookGuard - update the known-threat list from USOM

Fetches the malicious-address feed that USOM (Turkey's national CERT, now T.C. Siber
Guvenlik Baskanligi) publishes through its JSON API
(https://siberguvenlik.gov.tr/api/address/index) and appends every NEW entry to
data/usom_seen.csv, with USOM's own listing time. The API builds its blocklist from
this file at start-up, so restart it after an update.

Usage (from the repository root):
    python -m tools.update_usom --once                    # fetch new entries once
    python -m tools.update_usom --interval 3600           # keep fetching, hourly
    python -m tools.update_usom --once --backfill-days 7  # empty file: fetch only the last 7 days
    python -m tools.update_usom --retag                   # recompute brand and lure hints
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit

import requests

from backend.hints import brand_hint, lure_hint

USOM_API = "https://siberguvenlik.gov.tr/api/address/index"
PER_PAGE = 1000
DEFAULT_BACKFILL_DAYS = 30
DATA_DIR = Path("data")
SEEN_CSV = DATA_DIR / "usom_seen.csv"
FETCH_LOG_CSV = DATA_DIR / "usom_fetch_log.csv"

SEEN_FIELDS = ["usom_id", "entry", "kind", "usom_listed_utc", "first_seen_utc",
               "category", "source", "criticality", "brand_hint", "lure_hint"]
FETCH_FIELDS = ["fetched_at_utc", "pages", "new", "status"]

log = logging.getLogger("update_usom")


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def normalize(raw: str) -> str | None:
    """Lowercase an address and strip its scheme and trailing slash."""
    entry = raw.strip().lower()
    if not entry:
        return None
    if entry.startswith(("http://", "https://")):
        parts = urlsplit(entry)
        entry = (parts.netloc + parts.path).rstrip("/")
    return entry or None


def usom_time(value: str) -> str:
    """'2026-10-29 09:01:07.711309' (UTC) -> '2026-10-29T09:01:07Z'."""
    return value.split(".", 1)[0].replace(" ", "T") + "Z" if value else ""


def retag() -> int:
    """Recompute brand_hint and lure_hint for every stored entry."""
    with SEEN_CSV.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r["brand_hint"] = brand_hint(r["entry"])
        r["lure_hint"] = lure_hint(r["entry"])
    with SEEN_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=SEEN_FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    log.info("Retagged %d entries: %d brand hits, %d lure hits.", len(rows),
             sum(1 for r in rows if r["brand_hint"]), sum(1 for r in rows if r["lure_hint"]))
    return 0


def get_json(url: str, params: dict, timeout: int = 60, retries: int = 3) -> dict:
    headers = {"User-Agent": "HookGuard/0.1 (+https://github.com/DuranOzcelik/hookguard)"}
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
        except (requests.RequestException, ValueError) as exc:
            last_error = exc
            if attempt == retries:
                break
            wait = 10 * attempt
            log.warning("Fetch failed (attempt %d/%d): %s - retrying in %ds", attempt, retries, exc, wait)
            time.sleep(wait)
    raise RuntimeError(f"Could not fetch USOM feed: {last_error}")


def fetch_new(source: str, last_id: int, since: str | None) -> tuple[list[dict], int]:
    """Return feed records newer than last_id (newest first) and the page count.

    The API lists records newest first, so paging stops at the first known id.
    On the first run (last_id == 0) only records dated on or after `since` are fetched.
    """
    if not source.startswith(("http://", "https://")):
        models = json.loads(Path(source).read_text(encoding="utf-8"))["models"]
        return [m for m in models if int(m["id"]) > last_id], 1

    params: dict = {"per-page": PER_PAGE}
    if since:
        params["date_gte"] = since
    records: list[dict] = []
    page = 1  # the API is 1-indexed
    while True:
        params["page"] = page
        data = get_json(source, params)
        models = data.get("models") or []
        fresh = [m for m in models if int(m["id"]) > last_id]
        records.extend(fresh)
        if not models or len(fresh) < len(models) or page >= int(data.get("pageCount") or 0):
            return records, page
        page += 1
        time.sleep(1)  # go easy on the server


def load_seen() -> tuple[set[str], int]:
    """Return the known entries and the highest USOM id seen so far."""
    if not SEEN_CSV.exists():
        return set(), 0
    with SEEN_CSV.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    return {r["entry"] for r in rows}, max((int(r["usom_id"]) for r in rows), default=0)


def append_rows(path: Path, fields: list[str], rows: list[dict]) -> None:
    new_file = not path.exists()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        if new_file:
            writer.writeheader()
        writer.writerows(rows)


def collect_once(source: str, backfill_days: int) -> int:
    """Run a single fetch and return the number of new entries."""
    seen, last_id = load_seen()
    now = utc_now()
    since = None
    if last_id == 0:
        since = (datetime.now(timezone.utc) - timedelta(days=backfill_days)).strftime("%Y-%m-%d")

    try:
        records, pages = fetch_new(source, last_id, since)
    except Exception as exc:  # noqa: BLE001 - we want to log the error and carry on
        log.error("%s", exc)
        append_rows(FETCH_LOG_CSV, FETCH_FIELDS, [{"fetched_at_utc": now, "pages": 0, "new": 0, "status": f"error: {exc}"}])
        return -1

    new_rows = []
    for m in reversed(records):  # oldest first, so the CSV stays chronological
        entry = normalize(m.get("url") or "")
        if not entry or entry in seen:
            continue
        seen.add(entry)
        new_rows.append({
            "usom_id": m["id"],
            "entry": entry,
            "kind": m.get("type", ""),
            "usom_listed_utc": usom_time(m.get("date") or ""),
            "first_seen_utc": now,
            "category": m.get("desc", ""),
            "source": m.get("source", ""),
            "criticality": m.get("criticality_level", ""),
            "brand_hint": brand_hint(entry),
            "lure_hint": lure_hint(entry),
        })

    if new_rows:
        append_rows(SEEN_CSV, SEEN_FIELDS, new_rows)
    append_rows(FETCH_LOG_CSV, FETCH_FIELDS, [{"fetched_at_utc": now, "pages": pages, "new": len(new_rows), "status": "ok"}])

    brand_hits = sum(1 for r in new_rows if r["brand_hint"])
    scope = f"since {since}" if since else f"after id {last_id}"
    log.info("%d new entries (%s, %d page(s)), %d of them match a brand hint.",
             len(new_rows), scope, pages, brand_hits)
    return len(new_rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Update data/usom_seen.csv from USOM")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--once", action="store_true", help="Fetch once and exit")
    mode.add_argument("--interval", type=int, metavar="SECONDS", help="Fetch continuously at this interval (min 900)")
    mode.add_argument("--retag", action="store_true", help="Recompute brand/lure hints of stored entries and exit")
    parser.add_argument("--source", default=os.environ.get("USOM_SOURCE", USOM_API),
                        help="API URL or a saved JSON response (for testing)")
    parser.add_argument("--backfill-days", type=int, default=DEFAULT_BACKFILL_DAYS,
                        help="On the first run, how many days of history to fetch")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    if args.retag:
        return retag()
    if args.once:
        return 0 if collect_once(args.source, args.backfill_days) >= 0 else 1

    interval = max(args.interval, 900)  # at least 15 minutes to go easy on the server
    log.info("Continuous mode: fetching every %d seconds. Press Ctrl+C to stop.", interval)
    while True:
        collect_once(args.source, args.backfill_days)
        time.sleep(interval)


if __name__ == "__main__":
    sys.exit(main())
