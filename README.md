# FlowOps

FlowOps turns a sales spreadsheet into a clean order dataset and an interactive report. Upload a CSV or Excel file, review rows that need attention, and download the cleaned data or an issues CSV.

**Want to see it first?** Click **Explore demo**. Then switch to **Example with issues** to see how FlowOps handles duplicates, invalid values, and conflicting orders. Demo views do not appear in import history.

## Run locally

With Docker Desktop running, open a terminal in the project folder:

```powershell
docker compose up --build
```

Open [localhost:5173](http://localhost:5173). API docs are at [localhost:8000/docs](http://localhost:8000/docs). Migrations run automatically. `docker compose down` stops the services but keeps the database.

If Docker is unavailable, use the setup below.

<details>
<summary>Run without Docker</summary>

Install Python 3.13, Node.js 22.13+ or 24+, and PostgreSQL 17. Create a local database and user, then update the connection string:

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

```powershell
cd frontend
npm ci
npm run dev -- --host 127.0.0.1
```

</details>

## Try an import

Select one currency for the whole file: USD, EUR, GBP, or PLN. FlowOps does not detect or convert currencies.

```csv
order_id,date,customer,product,quantity,unit_price
FO-001,2026-09-01,Mira Ellis,Notebook,2,18.50
FO-001,2026-09-01,Mira Ellis,Bookmark,1,12.00
```

With USD selected, this produces **49.00 USD in revenue, 1 order, and 3 units sold**.

The fictional demo produces 3,445.00 USD in revenue from 48 valid lines. Its version with issues contains 56 lines: 48 accepted, 2 duplicates, and 6 invalid.

FlowOps accepts UTF-8 CSV and single-sheet XLSX files up to **5 MB or 10,000 lines**. Files need the six columns shown above. Dates can use `YYYY-MM-DD`, `YYYY/MM/DD`, or an Excel date without a time. Quantities must be positive whole numbers; prices must be non-negative numbers with no more than two decimal places. Excel formulas are excluded.

## How rows are reviewed

- FlowOps normalizes spaces, dates, and numbers before comparing rows. If all six fields match, it keeps the first valid row and lists later copies as potential duplicates.
- Because the file has no line ID, two genuinely identical items look like a duplicate. If both should count, combine their quantities in the source file and import again.
- An `order_id` must have the same date and customer on every line. If they conflict, all rows for that order are excluded.
- Invalid rows are not counted again as duplicates. One row can have more than one issue.

Download **Issues CSV** to see the source row, affected column, issue code, and explanation. Fix the original file and import it again; existing reports are not changed. Cleaned CSV and XLSX downloads keep the original six-column structure.

Older imports remain available with a legacy notice and no assigned currency. Reimport the original file to use the current rules.

## Checks

With the Python environment active, run from `backend`:

```powershell
$env:TEST_DATABASE_URL = $env:DATABASE_URL
pytest -q
ruff check .
ruff format --check .
mypy app
alembic upgrade head
alembic check
```

Run from `frontend`:

```powershell
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Integration tests need PostgreSQL and permission to create schemas. Without `TEST_DATABASE_URL`, they are skipped. CI runs the checks with PostgreSQL. See [QA notes](docs/QA.md) for browser checks and their limits.

## Project notes

The frontend uses React and TypeScript. FastAPI processes uploads and exports, while PostgreSQL stores validated rows, issues, and changes. Raw files are not retained, although issue messages may contain submitted values.

This is a **local, single-user portfolio project**. It has no accounts, separation between users, retention policy, or deletion screen. Use fictional data and do not publish this configuration as a public upload service. Taxes, refunds, currency conversion, and large background jobs are outside its scope.

See the [case study](docs/CASE_STUDY.md) and [screenshots](docs/screenshots/). To create a source ZIP, run from the project root:

```powershell
py -3.13 -m unittest discover -s scripts -p "test_*.py"
py -3.13 scripts/package_source.py
```

The ZIP is saved to `artifacts/flowops-source.zip`. Check it before sharing; file filters cannot detect secrets written inside source files.