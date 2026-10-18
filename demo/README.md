# FlowOps browser app

Import CSV or XLSX, choose a currency, review the report, and export cleaned CSV/XLSX or Issues CSV. Files are processed in a Web Worker and are never sent to a server.

IndexedDB stores the last 10 reports on this device. History supports reopening, individual deletion, and clearing. If storage is unavailable or full, the current report still works and a warning explains how to keep your results. Browser storage is not a backup.

Prepared fictional examples remain in `public/demo/`. Opening them does not add to history.

## Run and check

Use Node.js 22.13+ (22.x) or 24+:

```sh
npm ci
npm run dev
```

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 5174
```

From the repository root, run `python scripts/browser_demo_qa.py` with Playwright, Chromium, and openpyxl installed. It checks the production Worker, imports, exports, history, errors, and mobile layouts in an isolated browser context. See [QA notes](../docs/QA.md).

## Processing

Limits: 5 MiB, 10,000 data rows, one worksheet, and one selected currency. USD, EUR, GBP, and PLN are labels, not conversions. See the [input rules](../README.md#input-rules).

`src/processing/` contains parsing, validation, exact money calculations, exports, and the Worker client. Python-generated fixtures check the browser implementation against `backend/app/processing.py`. Regenerate them from the root with the backend environment active:

```sh
python scripts/generate_browser_fixtures.py
```

SheetJS is pinned to its official 0.20.3 tarball, as described in the [installation guide](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/). It is bundled at build time; the browser does not download a spreadsheet library from a CDN.

## Render

The existing Static Site uses the repository root, with no Root Directory setting:

- Build Command: `cd demo && npm ci && npm run build`
- Publish Directory: `demo/dist`
- Configuration: [`render.yaml`](../render.yaml)

Hash routes work without server rewrites. `frontend/` and `backend/` belong to the separate local FastAPI/PostgreSQL app. This build does not connect to them.
