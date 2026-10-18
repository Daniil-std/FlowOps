# FlowOps: sales spreadsheet review

Sales exports can contain copied rows, inconsistent formats, and conflicting order details. FlowOps makes those problems visible before showing revenue.

## Workflow

Import a CSV or XLSX and choose its currency. FlowOps validates the six required columns, normalizes accepted values, and separates valid lines from exclusions. The report includes sales metrics, charts, searchable cleaned data, issues, and changes. Users can export the cleaned data, fix the original file, and import it again.

The public browser app processes user-selected files in a Web Worker. Nothing in those files is sent to a server. IndexedDB keeps the last 10 reports, with reopening and deletion. Prepared fictional examples let visitors explore the interface before importing.

## Design choices

- Compare duplicates after normalization so formatting differences do not inflate sales.
- Exclude every line of an order when its date or customer conflicts; do not guess which identity is correct.
- Use integer cents for exact totals, including inputs at the supported numeric limits.
- Keep source row references and explain exclusions. Record changes only for accepted lines.
- Keep processing off the interface thread and support cancellation. A history failure must not discard a completed report.

## Implementation

The public app uses React, TypeScript, Vite, Recharts, SheetJS, Web Workers, and IndexedDB. Render serves the static build from `demo/`.

A separate local app uses the same interface and review policy with FastAPI, pandas, openpyxl, SQLAlchemy, Alembic, and PostgreSQL. It sends files to a local API and stores reports in the database. Docker Compose provides a local setup. This server configuration has no authentication or user isolation and is not a public upload service.

Python-generated fixtures compare the browser processor with the existing Python implementation. Unit tests cover exact totals, exports, limits, and history. Browser checks exercise the production build. See [QA notes](QA.md) for evidence and limits.

## Scope

This is a portfolio project, not a client engagement. All prepared data is fictional. No customer results or time savings are claimed.

Both versions support files up to 5 MiB and 10,000 data rows, one worksheet, and one selected currency. They do not calculate taxes, refunds, or currency conversions. Without line IDs, identical real items remain ambiguous. Browser history belongs to one device and can be removed by browser storage cleanup.

The [existing screenshots](screenshots/) show the earlier local full stack interface. They are not evidence of the current public deployment; the current browser QA script writes new captures to `artifacts/browser-demo/`.
