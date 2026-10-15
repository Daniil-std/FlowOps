# Verification — 15 October 2026

## Automated checks

- Backend: **68 tests passed** with real PostgreSQL, including isolated schema migrations and persistence; none skipped.
- Frontend: **16 tests passed**, including a report surviving history failure, history pagination loading/retry, one-click read-only demo, currency selection, and zero-valid-row recovery.
- Ruff lint/format, mypy, ESLint, Prettier, TypeScript checks, and production Vite build.
- Alembic upgrade/check and legacy migration regression: stored records remain unchanged; currency is unspecified and the older processing policy is identified.
- Source ZIP exclusion test: **1 passed**; dependencies, cache, database, credential, and environment files stay outside the archive and remain on disk.

## Browser walkthrough

Executed locally in Chromium via Playwright against a separate, disposable PostgreSQL database:

- One-click demo; switching clean/issue examples does not change the history count.
- CSV with deliberate errors imported with USD; cleaned CSV/XLSX and issues CSV downloaded and their contents parsed.
- Cleaned XLSX imported with explicitly selected EUR; metrics, API results, and export filename checked for EUR.
- File with zero valid rows imported with PLN; issues CSV available, cleaned exports disabled, recovery link opens a new upload.
- Malformed column error displayed; simulated history service failure leaves report and exports usable.
- History pagination and reopening stored reports.
- Overview, report (all three tabs), import, and populated history at 320, 375, 768, and 1440 px: no page-level horizontal overflow. Wide tables scroll inside their own regions.
- Keyboard tab switching, mobile navigation focus, and Escape returning focus to its opener.
- axe-core 4.10.3 scans on four pages at all four widths: no reported violations. No browser JavaScript exceptions were recorded.

Six real screenshots are in [screenshots](screenshots/); none of the planned images is missing. These are local application captures, not mockups. Browser coverage is Chromium only; real-device Safari/Firefox and a full screen-reader audit were not performed. Automated accessibility checks are not a complete accessibility certification.

The built production frontend was also opened with Vite preview: desktop/mobile reports, chart assets, and absence of JavaScript errors were checked.

Docker Compose configuration was validated. A full container startup was not tested because the Docker daemon was unavailable; the app and PostgreSQL were run natively instead. Backend tests emit an upstream Starlette/httpx deprecation warning; it does not fail the suite.

## Repeat the browser checks

Use a **fresh, empty disposable database** for the backend, apply migrations, and start both services. The script creates fictional imports and refuses a nonempty history. Do not point it at a working database.

```powershell
pip install playwright
python -m playwright install chromium
python scripts/browser_qa.py
```

Run from the project root in the backend virtual environment (which supplies openpyxl). Default URL: `http://127.0.0.1:5173`; override with `QA_BASE_URL`. To include axe scans, set `AXE_PATH` to a local axe-core script; without it only browser interaction/layout checks run. Outputs: six screenshots and `artifacts/browser-qa.json`. Browser tooling is optional and is not needed to run FlowOps.
