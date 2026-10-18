# FlowOps

FlowOps turns a sales spreadsheet into cleaned order data and an interactive report. Review excluded rows, inspect changes, explore sales charts, and download the results.

[Open FlowOps](https://flowops-d7cs.onrender.com) or try the prepared fictional examples. Examples do not appear in import history.

## Two versions

| | Public browser app | Local full stack app |
| --- | --- | --- |
| Source | `demo/` | `frontend/` and `backend/` |
| Processing | Web Worker on your device | Python in FastAPI |
| File transfer | Files stay in the browser | Files are sent to your local API |
| History | Last 10 reports in IndexedDB | Reports in PostgreSQL |
| Delete reports | Individual deletion or clear history | No deletion screen |
| Hosting | Render Static Site | Docker Compose or local services |

The browser app needs no account or backend. History is specific to the browser and site address; it is not synced or backed up. Clearing site data, private browsing, or storage eviction can remove it. If saving fails, the report remains usable in the current tab and FlowOps shows a warning. Download anything you want to keep.

The local app is a single-user portfolio project with no authentication or user isolation. Do not expose its API as a public upload service. Raw files are not retained; stored reports include cleaned data, issues, and changes. Issue messages may include submitted values.

## Input rules

Choose USD, EUR, GBP, or PLN for the whole file. FlowOps does not detect or convert currencies.

```csv
order_id,date,customer,product,quantity,unit_price
FO-001,2026-09-01,Mira Ellis,Notebook,2,18.50
FO-001,2026-09-01,Mira Ellis,Bookmark,1,12.00
```

With USD selected, this gives 49.00 USD in revenue, 1 order, and 3 units.

- UTF-8 comma-separated CSV or one-sheet XLSX, up to **5 MiB (5,242,880 bytes)** and **10,000 data rows**.
- Exactly the six columns above, in any order. Header casing and surrounding spaces are normalized.
- Dates: `YYYY-MM-DD`, `YYYY/MM/DD`, or an Excel date without a time.
- Quantity: a positive whole number. Unit price: a non-negative number representable to two decimal places. Trailing zeros are allowed. Both are limited to 1,000,000.
- Use decimal points. Grouped values such as `1,234.50` are accepted; ambiguous separators such as `1,234` are rejected. Quote values containing commas in CSV.
- Each value is required and may contain up to 200 characters. Excel formulas are excluded. Expanded XLSX content is limited to 50 MiB and 200 archive entries.

FlowOps trims surrounding spaces and normalizes dates and numbers before comparing rows. It keeps the first matching row and lists later copies as potential duplicates. Without a line ID, genuinely identical items look like duplicates; combine their quantities in the source file if both should count.

An `order_id` must have the same date and customer on every line. Conflicts exclude all rows for that order, including conflicts on otherwise invalid items. IDs and names remain case-sensitive. Invalid rows are not also counted as duplicates, and one row may have several issues.

The report shows accepted rows in **Cleaned data**, exclusions in **Issues**, and normalization of accepted rows in **Changes**. Search and pagination help review larger files. Fix the original file and import it again to create a new report.

Cleaned CSV and XLSX keep the six-column schema. Export names include the currency; select it again when reimporting. CSV exports prefix formula-like text with an apostrophe. XLSX keeps it as literal text. Issues CSV includes source row, column, issue code, and explanation.

Taxes, refunds, currency conversion, and large background jobs are outside the project scope. All prepared examples are fictional.

## Run the browser app

Use Node.js 22.13+ (22.x) or 24+:

```sh
cd demo
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173). See [browser app notes](demo/README.md) for the production build and Render settings.

## Run the local full stack app

With Docker Desktop running, from the repository root:

```sh
docker compose up --build
```

Open [localhost:5173](http://localhost:5173). API docs: [localhost:8000/docs](http://localhost:8000/docs). Migrations run automatically. `docker compose down` keeps the database volume. Stop the browser app first if it uses the same port.

<details>
<summary>Run without Docker</summary>

Install Python 3.13, Node.js 22.13+ (22.x) or 24+, and PostgreSQL 17. Create a local database and user, then set the connection string. In PowerShell:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.lock
pip install --no-deps -e backend
$env:DATABASE_URL = 'postgresql+psycopg://flowops:flowops@localhost:5432/flowops'
cd backend
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --reload
```

In another terminal:

```sh
cd frontend
npm ci
npm run dev -- --host 127.0.0.1
```

Older PostgreSQL reports retain their original results and show a legacy notice. Reimport the source to select a currency and apply the current rules.

</details>

## Checks and source archive

In each of `demo/` and `frontend/`, run:

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

With the backend Python environment active, run from `backend/`:

```sh
pytest -q
ruff check .
ruff format --check .
mypy app
```

Integration tests need `TEST_DATABASE_URL` pointing to a disposable PostgreSQL database with schema-creation permission. Otherwise they are skipped. CI supplies PostgreSQL and checks migrations. See [QA notes](docs/QA.md) for executed checks and browser instructions.

From the root:

```sh
python -m unittest discover -s scripts -p "test_*.py"
python scripts/package_source.py
```

The archive at `artifacts/flowops-source.zip` includes both apps, fictional examples, and `render.yaml`. It excludes dependencies, builds, caches, credentials, environment files, and local data directories. Filename filters cannot detect secrets embedded in source; review source content before sharing.

See the [case study](docs/CASE_STUDY.md) for the project scope.
