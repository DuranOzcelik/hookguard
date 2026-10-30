"""
HookGuard - safe short links

The web page can shorten a link, but only after checking where it leads: a destination
that would read "Dangerous" is refused. Opening a short link (/s/<code> on the web page)
checks the destination again, since a site can turn bad after the link was made, and
shows the result before the person continues.

Shortening stores the full link: that is what a short link is. Nothing else is kept,
not who made it. The store is runtime/shortlinks.sqlite3, which is never committed.
Short links only work for others while the API and the web page are reachable for them.
"""

from __future__ import annotations

import re
import secrets
import sqlite3
import string
import threading
from datetime import datetime, timezone
from pathlib import Path

STORE = Path("runtime") / "shortlinks.sqlite3"
ALPHABET = string.ascii_letters + string.digits
CODE_LENGTH = 7
CODE = re.compile(rf"^[A-Za-z0-9]{{{CODE_LENGTH}}}$")


class ShortLinks:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS links (code TEXT PRIMARY KEY, url TEXT NOT NULL, host TEXT NOT NULL, "
                        "created_utc TEXT NOT NULL)")
        self.db.commit()
        self.lock = threading.Lock()

    def create(self, url: str, host: str) -> str:
        created = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with self.lock:
            while True:
                code = "".join(secrets.choice(ALPHABET) for _ in range(CODE_LENGTH))
                try:
                    self.db.execute("INSERT INTO links VALUES (?, ?, ?, ?)", (code, url, host, created))
                    self.db.commit()
                    return code
                except sqlite3.IntegrityError:
                    continue  # the code was taken; draw another

    def get(self, code: str) -> dict | None:
        if not CODE.match(code):
            return None
        with self.lock:
            row = self.db.execute("SELECT code, url, host, created_utc FROM links WHERE code = ?", (code,)).fetchone()
        return dict(zip(("code", "url", "host", "created_utc"), row)) if row else None


def refused(result: dict) -> bool:
    """What would read "Dangerous": a high score, an illegal betting site or a fake virus page."""
    category = result.get("category") or {}
    raised = category.get("id") == "tech_support" or (category.get("id") == "gambling" and category.get("confidence") == "high")
    return result["level"] == "high" or raised
