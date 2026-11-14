# Droplates — backend

Source data, build tools and tests for [droplates.com](https://droplates.com). The website itself lives in
[droplates-frontend](https://github.com/investedia/droplates-frontend).

There is no server yet: Droplates is a static site. This repository holds everything that produces or checks
that site, and is where future server-side work (form handling, downloads, accounts) will go.

## Contents

| Path | Purpose |
|---|---|
| `data/templates.json` | Catalogue: every template, its category, status, version, pages and prices |
| `tools/build.js` | Generates the catalogue, product, docs, preview, match, saved, support and custom pages into the frontend |
| `tools/annotate.py` | Adds stable edit IDs (`data-e`, `data-el`, `data-ei`, `data-s`) to template HTML for Template Studio. Idempotent |
| `tests/run.js` | Playwright tests for the marketplace, Template Studio and the templates |
| `graphify-out/` | Code graph of the project (`graphify update .` to refresh) |

## Setup

Check out both repositories side by side:

```
droplates-backend/
droplates-frontend/
```

Tools and tests find the frontend at `../droplates-frontend`. Set `DROPLATES_SITE=/path/to/frontend` to use another location.

## Commands

```bash
node tools/build.js          # regenerate pages in the frontend from data/templates.json
python3 tools/annotate.py    # add edit IDs to template HTML in the frontend
```

Tests need the frontend served locally and Playwright installed:

```bash
(cd ../droplates-frontend && python3 -m http.server 8766)
node tests/run.js            # BASE=https://droplates.com/ node tests/run.js to test the live site
```

After running the build or annotate tool, commit the resulting changes in the frontend repository.
