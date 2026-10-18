# Verification - 18 October 2026

## Browser app (`demo/`)

The production build was exercised locally in Chromium through Playwright. The run used an isolated browser context and fictional files; no backend was running for this app.

Completed checks:

- CSV import through the bundled Web Worker; currency selection and real report metrics.
- Cleaned data, Issues, Changes, keyboard tab switching, search, and pagination.
- Cleaned CSV/XLSX and Issues CSV downloads, checked with Python CSV parsing and openpyxl.
- CSV to report to XLSX to reimport with EUR; unchanged totals and no excluded rows.
- History after reload, reopening reports, the 10-report cap, individual deletion, and clearing history.
- Cancellation without a history entry; malformed columns, file size and row limits, and a report with no valid rows.
- Disabled browser storage: a visible warning, a usable report, and working XLSX export.
- Overview, import, history, and report at 320, 375, 768, and 1440 px. No page-level horizontal overflow. Wide tables scroll within their containers.
- Mobile navigation, focus on opening, and Escape returning focus to the menu button.
- 16 axe-core scans across those pages and widths: no reported violations.
- No browser JavaScript exceptions. The request log contained only same-origin GET requests; files were not uploaded.

All 72 browser unit tests passed, including 63 Python reference cases, XLSX round trips, formula-safe exports, exact totals at 10,000 rows, size limits, history retention and failures, and Worker cancellation/errors/timeouts. A clean `npm ci`, TypeScript, ESLint, Prettier, and the production build also passed.

## Local full stack app

- Backend: 68 tests passed with a separate disposable PostgreSQL database; none skipped.
- Ruff lint/format and mypy passed. Alembic upgrade and schema check passed.
- Frontend: 16 tests passed, plus TypeScript, ESLint, Prettier, and production build. One test timed out during a concurrent run; the full suite passed when run with `--maxWorkers=1`.
- Source archive exclusion test passed. It includes `demo/`, `render.yaml`, and fictional XLSX downloads while excluding dependencies, builds, secrets by filename, and local data directories. Excluded files remain on disk.

The existing `docs/screenshots/` captures and `scripts/browser_qa.py` belong to the earlier local API-based application. That separate browser walkthrough and Docker startup were not repeated for this update. Backend tests emit an upstream Starlette/httpx deprecation warning.

## Repeat the browser checks

Build and serve the static app:

```sh
cd demo
npm ci
npm run build
npm run preview -- --host 127.0.0.1 --port 5174
```

In another terminal, from the repository root, with Python 3.13:

```sh
pip install playwright==1.64.0 openpyxl==3.1.5
python -m playwright install chromium
python scripts/browser_demo_qa.py
```

`QA_BASE_URL` changes the target URL. `AXE_PATH` enables accessibility scans using a local axe-core script; without it, only interaction and layout checks run. Results and current screenshots go to `artifacts/browser-demo/`, outside Git and the source ZIP. The script creates and clears reports only in its own browser context.

To check the separate local API app, start its frontend and backend with a fresh disposable PostgreSQL database, apply migrations, then run `python scripts/browser_qa.py`. It refuses a nonempty history. Its default URL is `http://127.0.0.1:5173`.

## Limits

Coverage is Chromium only. Safari, Firefox, real devices, and a full screen-reader audit were not tested. Automated accessibility scans are not an accessibility certification. Browser storage may be evicted, and cannot replace downloaded backups. Local verification does not by itself confirm that Render has deployed a commit.
