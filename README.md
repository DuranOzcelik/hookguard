<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.webp">
    <img src="docs/images/hero-light.webp" alt="The HookGuard web page: a box to paste a suspicious link, and a phone showing a scam text message marked Dangerous" width="900">
  </picture>
</p>

<h1 align="center">HookGuard</h1>

<p align="center">
  <strong>Check before you click.</strong><br>
  A phishing link checker and browser extension for people who are not technical, built around the scams that reach phones in Turkey.
</p>

<p align="center">
  <a href="https://github.com/DuranOzcelik/hookguard/actions/workflows/ci.yml"><img src="https://github.com/DuranOzcelik/hookguard/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/languages-English%20%7C%20T%C3%BCrk%C3%A7e-5b3df5" alt="English and Turkish">
  <img src="https://img.shields.io/badge/browsers-Chrome%20%7C%20Edge%20%7C%20Firefox-0369a1" alt="Chrome, Edge and Firefox">
</p>

---

A text message says your parcel is stuck, your bank account is suspended or you have won a prize, and it has a link. HookGuard tells you what that link really is before you open it: **Looks safe**, **Be careful** or **Dangerous**, why, and what to do next. If you already clicked, it tells you what to do now.

It comes in three parts that work together:

- **A web page** where anyone can paste a link and get an answer in seconds.
- **A browser extension** for Chrome, Edge and Firefox that stops dangerous sites before they open.
- **An API** that does the checking, and that you can run yourself.

## What it looks like

<table>
  <tr>
    <td width="50%"><img src="docs/images/result.webp" alt="A result card: Dangerous, the reasons, what to do and what to do if you already clicked"></td>
    <td width="50%"><img src="docs/images/extension-warning.webp" alt="The extension's warning page, shown before a dangerous site opens"></td>
  </tr>
  <tr>
    <td><b>The answer.</b> A clear title, the reasons in plain words, what to do, and a button to warn the person who sent the link.</td>
    <td><b>The extension.</b> A dangerous site is stopped before it loads. Known scams never reach the page.</td>
  </tr>
  <tr>
    <td><img src="docs/images/extension-banner.webp" alt="An orange strip on top of a suspicious page"></td>
    <td><img src="docs/images/short-links.webp" alt="The short links page with a safe short link and its check"></td>
  </tr>
  <tr>
    <td><b>Be careful.</b> On suspicious pages an orange strip explains why, in a Shadow DOM the page cannot hide.</td>
    <td><b>Short links.</b> See where a bit.ly link really goes, or make a short link that shows a safety check first.</td>
  </tr>
</table>

<p align="center">
  <img src="docs/images/palettes.webp" alt="The same page in the five colour palettes: Aurora, Ocean, Orchid, Lagoon and Graphite" width="900"><br>
  <sub>Five colour palettes, light and dark themes, English and Turkish.</sub>
</p>

## Features

**Web page**
- Paste a link (even a "defanged" one like `hxxps://site[.]com`) and get a verdict with reasons, steps to take, and steps for after a click.
- Warn the sender on WhatsApp with one tap; only the domain goes into the message.
- Report a suspicious site, or a false alarm.
- **Short links:** expand a bit.ly, t.co or tinyurl link without visiting where it leads, or shorten a link safely. Dangerous destinations are refused, and whoever opens a HookGuard short link first sees where it goes and a fresh check.
- English or Turkish; five colour palettes (Aurora, Ocean, Orchid, Lagoon, Graphite); light, dark or system theme.
- Large type, high contrast (WCAG AA in every palette and theme), keyboard friendly, honours reduced motion.

**Browser extension**

| | |
| --- | --- |
| Known scams | Stopped before the page loads, using a local hash list. No request leaves the browser. |
| Suspicious sites | The domain is checked. Dangerous ones get a warning page, doubtful ones an orange strip. Redirect chains are followed hop by hop. |
| Form protection | Warns the moment you start typing a password, a card number or a Turkish ID number into a risky or brand-new site. What you type is examined on your device and never sent. |
| Download warning | Pauses `.apk` files from anything but well-known sites, and `.exe` and similar files from risky sites, until you decide. This guards against fake bank and parcel apps. |
| Short link preview | Hover a short link to see where it leads and how that site looks. The destination is never contacted. |
| Link badges | Green, orange or red badges next to links in Gmail, Outlook and WhatsApp Web. |
| Page signals | Recognises illegal betting pages (with Yeşilay's helpline 115), fake investment promises, shops without an ETBİS registration and fake "virus found" screens. |
| Family mode | Locks betting and adult sites behind a PIN. |
| Weekly summary | A short notification each week, counted on your device. |

Every protection except the known-scam block can be switched off in the extension's settings.

## How it decides

The API scores a domain from 0 to 100. Below 40 it reads "Looks safe", 40 to 69 "Be careful", and 70 or more "Dangerous".

| Signal | Effect |
| --- | --- |
| On the known-threat list (USOM, Turkey's national CERT, plus reviewed user reports), or its parent domain or IP address is | at least 95, 90 or 85 |
| A machine-learning model of the name: character patterns of 4,400 phishing domains against 30,000 ordinary ones | up to 60 |
| A brand's name in a domain that is not the brand's; lure words such as "kampanya" or "hediye" | +10; +5 |
| How long the domain has existed (RDAP, or WHOIS for `.tr`) | +20 if under a week old; −10 if over two years |
| A subdomain of a free hosting or dynamic DNS service; a bare IP address | +5; +25 |
| An official brand domain; one of the world's most visited sites | capped low |

Next to the score, a category is guessed from the name and, in the extension, from the page: illegal betting, fake investment, fake shop, adult or fake tech support. A category can raise the verdict people see (an illegal betting site is never shown as safe) but never changes the score.

At the threshold it uses for alarms, the model catches about half of new phishing domains from their name alone, at a false-positive rate of 0.1%. The other signals do the rest. No tool can promise 100%; the page says so too.

## Privacy

- Only the **domain** is checked, never the full link. From `ptt-kargo-odeme.example/track?no=123` the server receives `ptt-kargo-odeme.example`.
- The extension checks known scam sites and well-known sites **locally** and never asks the server about them.
- Form protection, page signals and the weekly counts stay on the device.
- The API keeps queried domains in memory only. Reports keep the domain, a category and an optional note, and nothing about the reporter.
- There are two explicit exceptions, both opt-in and both explained on screen. **Expanding a short link** sends the short link itself, after you ask. **Shortening a link** stores the full link, because that is what a short link is.

## Getting started

You need **Python 3.12+** and **Node.js 24+**. Run everything from the repository root.

### 1. The API

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

# Optional: the Tranco list of popular sites, for the "well-known site" signal and the extension's allowlist
mkdir -p external/tranco
curl -L -o external/tranco/top-1m.csv.zip https://tranco-list.eu/top-1m.csv.zip

# Train the name model (about a minute) -> external/stage1.joblib
python -m tools.train_model

# Start the API on http://127.0.0.1:8000
uvicorn backend.app:app --port 8000 --no-access-log
```

The API runs without the model and without Tranco as well; it just has fewer signals.

### 2. The web page

```bash
npm install
npm run dev -w web          # http://localhost:5173, /api is proxied to port 8000
```

For production, run `npm run build -w web` and serve `web/dist`. Set `VITE_API_BASE` if the API lives on another address, and let `/short-links` and `/s/*` fall back to `index.html`.

### 3. The browser extension

```bash
npm run build -w extension            # Chrome  -> extension/.output/chrome-mv3
npm run build:edge -w extension       # Edge    -> extension/.output/edge-mv3
npm run build:firefox -w extension    # Firefox -> extension/.output/firefox-mv3
```

- **Chrome or Edge:** open `chrome://extensions` (or `edge://extensions`), turn on *Developer mode*, choose *Load unpacked* and pick the folder.
- **Firefox 140+:** open `about:debugging`, choose *This Firefox* > *Load Temporary Add-on* and pick `manifest.json`.

The extension talks to `http://127.0.0.1:8000` by default. Change it in the extension's settings, or build with `WXT_API_BASE=https://your-api.example npm run build -w extension`.

## Keeping it up to date

```bash
python -m tools.update_usom --once     # fetch new entries from USOM into data/usom_seen.csv
python -m tools.train_model            # optional: retrain the model on the new entries
```

Restart the API afterwards. Extensions download the new hash lists within six hours, or at once with *Update the list now* in their settings.

Reports from the web page and the extension wait for review:

```bash
python -m backend.reports list                  # pending reports, most reported first
python -m backend.reports approve DOMAIN        # -> data/community_blocklist.csv, used after the next restart
python -m backend.reports reject DOMAIN
```

Nothing reaches other users unreviewed, so nobody can get a competitor blocked by reporting it.

## API

| Endpoint | |
| --- | --- |
| `POST /api/check` | `{"domain": "...", "lang": "en"}` returns `score`, `level`, `reasons`, `category` and `details` |
| `POST /api/expand` | `{"url": "https://bit.ly/..."}` returns the host a short link leads to (known shorteners only) |
| `POST /api/shorten` | `{"url": "..."}` returns a short link, unless the destination is dangerous |
| `GET /api/short/{code}` | Where a HookGuard short link leads, checked again now |
| `POST /api/report` | `{"domain", "category", "note"}`: a report for review |
| `GET /api/blocklist` | SHA-256 prefixes of known-threat names, for the extension (`ETag`-cached) |
| `GET /api/allowlist` | The same for official and very popular sites |
| `GET /api/health` | What is loaded |

Each client address may make 60 requests a minute. Interactive documentation is at `/docs` while the API runs.

## Project layout

```
backend/          the API (FastAPI): scoring, categories, lookups, reports, short links
tools/            update_usom.py (refresh the threat list), train_model.py (train the name model)
data/             usom_seen.csv (known threats), ct_random.csv (ordinary domains), tr_brands.csv (official brand domains)
shared/           shared by the web page and the extension: texts in both languages, design tokens, React components
web/              the web page (React, Vite, TypeScript)
extension/        the browser extension (WXT, React; Manifest V3)
design-system/    the design system (MASTER.md)
tests/            API tests (pytest)
```

## Development

```bash
python -m pytest           # API: no network, data or model needed
npm test -w web            # shared helpers: domains, hashes, card and ID number checks
```

The visual design follows `design-system/MASTER.md`. Components use only the tokens in `shared/design/`; palettes are in `palettes.css`. All user-facing text lives in `shared/content.ts` and in `TEXT = { en, tr }` dictionaries next to the components. It never names sources or techniques: people read "a list of known scam sites", not the name of a feed or a model.

## Limitations

- The betting, investment and shop categories are rules, not trained models; there is no labelled data for them yet. The list of licensed Turkish betting sites (`LEGAL_BETTING` in `backend/categories.py`) must be kept current.
- The first check of a new domain takes a second or two (WHOIS), so a page the API rates dangerous may start loading before the warning replaces it. Known scams are always stopped first.
- Short links made on a local setup only work for other people once the web page and the API are reachable for them.
- Link badges rely on how Gmail, Outlook and WhatsApp Web build their pages, which can change.

## Background

HookGuard started as research on phishing in Turkey. Across 4,076 domains on USOM's list, 26% had a fresh TLS certificate, and for 98% of those the certificate appeared before the listing, a median of 19 hours earlier. That gap is what an early-warning tool can use. The research tooling (certificate-log listeners, crawlers) is not part of this repository; what is here is what people need to stay safe.

## Credits

Icons: [Solar](https://icon-sets.iconify.design/solar/) by 480 Design (CC BY 4.0). Fonts: Atkinson Hyperlegible by the Braille Institute and Bricolage Grotesque by Mathieu Triay (SIL OFL). Details are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Known threats come from [USOM](https://siberguvenlik.gov.tr/zararli-baglantilar), and popular sites from the [Tranco](https://tranco-list.eu) list.

HookGuard helps; it is not a guarantee. When in doubt, do not enter your details: call the organisation on its official number.
