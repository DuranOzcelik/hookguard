"""
HookGuard - API

    uvicorn backend.app:app --port 8000        # from the repository root

POST /api/check      {"domain": "a101-hediye.xyz"} -> 0-100 risk score, level, reasons and category
POST /api/expand     {"url": "https://bit.ly/x"} -> the host a short link leads to (shorteners only)
POST /api/report     {"domain": ..., "category": ...} -> stored for review (reports.py)
POST /api/shorten    {"url": ...} -> a short link, unless the destination is dangerous (shortener.py)
GET  /api/short/CODE -> where a short link leads, checked again now
GET  /api/blocklist  hashes of the names USOM lists, for the extension's local check
GET  /api/allowlist  hashes of official and very popular domains, which the extension does not send
GET  /api/health

/api/check takes a host name only. A pasted link is cut down to its host before
anything else, and queried names are kept in memory caches only, never written.
/api/expand is the one exception: the user asks for it explicitly on the web page,
because a short link's host says nothing; the URL is used for the redirects and dropped.
Hashes are the first 16 hex characters of SHA-256 over the lowercase ASCII
(punycode) host; the extension checks a host and each of its parents.
"""

from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .categories import classify
from .domains import is_ip, normalize_host, registered_domain
from .lookups import Lookups
from .references import ROOT, References
from .reports import CATEGORIES as REPORT_CATEGORIES
from .reports import save_report
from .scoring import Facts, assess
from .shortener import STORE, ShortLinks, refused
from .shortlinks import expand, is_short_link

LOOKUP_TIMEOUT = 8  # seconds for DNS and WHOIS together; the score is given without what is missing
RATE_LIMIT = 60     # checks per client address per minute; every check may query DNS and WHOIS servers
# The web app in development, and the extension's own pages in Chrome, Edge and Firefox.
ALLOWED_ORIGINS = r"^(https?://(localhost|127\.0\.0\.1)(:\d+)?|chrome-extension://[a-p]{32}|moz-extension://[0-9a-f-]{36})$"


class CheckRequest(BaseModel):
    domain: str = Field(max_length=2048, description="A host name; a pasted link is cut down to its host")
    lang: Literal["tr", "en"] = "en"


class ExpandRequest(BaseModel):
    url: str = Field(max_length=2048)


class ShortenRequest(BaseModel):
    url: str = Field(max_length=2048)
    lang: Literal["tr", "en"] = "en"


class ReportRequest(BaseModel):
    domain: str = Field(max_length=2048)
    category: Literal[REPORT_CATEGORIES] = "phishing"  # type: ignore[valid-type]
    note: str = Field("", max_length=1000)
    source: Literal["web", "extension"] = "web"


class RateLimiter:
    def __init__(self, limit: int, window: float = 60):
        self.limit, self.window = limit, window
        self.hits: dict[str, deque] = defaultdict(deque)

    def allow(self, client: str) -> bool:
        now = time.monotonic()
        if len(self.hits) > 10_000:  # forget idle clients
            self.hits = defaultdict(deque, {c: h for c, h in self.hits.items() if h and h[-1] > now - self.window})
        hits = self.hits[client]
        while hits and hits[0] < now - self.window:
            hits.popleft()
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        return True


async def gather_facts(host: str, refs: References, lookups: Lookups) -> Facts:
    """DNS for the host and the registration date of its domain, in parallel and time-limited."""
    facts = Facts()
    jobs = {}
    if not is_ip(host):
        jobs["dns"] = asyncio.to_thread(lookups.resolve, host)
        if refs.shared_host(host) is None:
            jobs["registration"] = asyncio.to_thread(lookups.registration, registered_domain(host))
    tasks = {name: asyncio.ensure_future(job) for name, job in jobs.items()}
    if tasks:
        await asyncio.wait(tasks.values(), timeout=LOOKUP_TIMEOUT)
    for name, task in tasks.items():
        if task.done() and not task.exception():
            setattr(facts, name, task.result())
        else:
            task.cancel()
    return facts


def hash_response(payload: dict, request: Request) -> Response:
    etag = f'"{payload["version"]}"'
    headers = {"ETag": etag, "Cache-Control": "public, max-age=3600"}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=headers)
    return JSONResponse(payload, headers=headers)


def create_app(refs: References | None = None, lookups: Lookups | None = None,
               rate_limit: int = RATE_LIMIT, reports_root: Path = ROOT, store_path: Path | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.refs = refs or await asyncio.to_thread(References.load)
        app.state.lookups = lookups or Lookups()
        app.state.reports_root = reports_root
        app.state.short_links = ShortLinks(store_path or ROOT / STORE)
        yield

    app = FastAPI(title="HookGuard API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origin_regex=ALLOWED_ORIGINS, allow_methods=["GET", "POST"],
                       allow_headers=["Content-Type", "If-None-Match"], expose_headers=["ETag"])
    limiter = RateLimiter(rate_limit)

    @app.post("/api/check")
    async def check(body: CheckRequest, request: Request) -> dict:
        if not limiter.allow(request.client.host if request.client else "?"):
            raise HTTPException(429, "Too many checks; try again in a minute")
        host = normalize_host(body.domain)
        if host is None:
            raise HTTPException(422, "Not a domain name or IP address")
        return await full_check(host, body.lang)

    async def full_check(host: str, lang: str) -> dict:
        facts = await gather_facts(host, app.state.refs, app.state.lookups)
        result = assess(host, app.state.refs, facts, lang)
        result["category"] = classify(host, app.state.refs, facts, lang)
        result["checked_utc"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        return result

    @app.post("/api/shorten")
    async def shorten(body: ShortenRequest, request: Request) -> dict:
        if not limiter.allow(request.client.host if request.client else "?"):
            raise HTTPException(429, "Too many requests; try again in a minute")
        url = body.url.strip()
        if "://" not in url:
            url = "https://" + url
        host = normalize_host(url)
        if host is None or urlsplit(url).scheme not in ("http", "https"):
            raise HTTPException(422, "Not a web link")
        if is_short_link(host):
            raise HTTPException(422, "Already a short link")
        result = await full_check(host, body.lang)
        if refused(result):
            return {"code": None, "path": None, "destination": host, "result": result}
        code = await asyncio.to_thread(app.state.short_links.create, url, host)
        return {"code": code, "path": f"/s/{code}", "destination": host, "result": result}

    @app.get("/api/short/{code}")
    async def short(code: str, request: Request, lang: Literal["tr", "en"] = "en") -> dict:
        if not limiter.allow(request.client.host if request.client else "?"):
            raise HTTPException(429, "Too many requests; try again in a minute")
        link = await asyncio.to_thread(app.state.short_links.get, code)
        if link is None:
            raise HTTPException(404, "No such short link")
        return {**link, "destination": link["host"], "result": await full_check(link["host"], lang)}

    @app.post("/api/expand")
    async def expand_link(body: ExpandRequest, request: Request) -> dict:
        if not limiter.allow(request.client.host if request.client else "?"):
            raise HTTPException(429, "Too many checks; try again in a minute")
        try:
            return await asyncio.to_thread(expand, body.url)
        except ValueError:
            raise HTTPException(422, "Not a link from a known link shortener") from None

    @app.post("/api/report")
    async def report(body: ReportRequest, request: Request) -> dict:
        if not limiter.allow(request.client.host if request.client else "?"):
            raise HTTPException(429, "Too many reports; try again in a minute")
        host = normalize_host(body.domain)
        if host is None:
            raise HTTPException(422, "Not a domain name or IP address")
        await asyncio.to_thread(save_report, host, body.category, body.note, body.source, app.state.reports_root)
        return {"status": "received", "domain": host}

    @app.get("/api/blocklist")
    async def blocklist(request: Request) -> Response:
        return hash_response(app.state.refs.blocklist(), request)

    @app.get("/api/allowlist")
    async def allowlist(request: Request) -> Response:
        return hash_response(app.state.refs.allowlist(), request)

    @app.get("/api/health")
    async def health() -> dict:
        refs: References = app.state.refs
        return {"status": "ok", "usom_names": len(refs.usom), "usom_latest_utc": refs.blocklist()["latest_listed_utc"],
                "model": refs.model is not None, "tranco": bool(refs.ranks)}

    return app


app = create_app()
