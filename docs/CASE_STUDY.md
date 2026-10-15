# FlowOps — sales spreadsheet review

## Problem

Sales exports can contain duplicate items, inconsistent number formats, and incomplete orders. A useful report needs to show which rows were accepted and explain exclusions before presenting revenue.

## Solution

FlowOps takes a CSV or XLSX file, applies an explicit review policy, and produces an interactive sales report with cleaned exports and a downloadable issues checklist. One-click fictional demos let a visitor inspect the workflow without creating repeated imports. Currency is chosen per file; ambiguous order identities are excluded for review.

## My role

I am the author of this demonstration project, responsible for its workflow, frontend, backend, data model, validation rules, tests, and local delivery setup. It is a portfolio project, not a commissioned client engagement. All example names, orders, and amounts are fictional; no client results or time-saving claims are implied.

## Key screens

1. [Overview](screenshots/01-overview.png): the business task and one-click demo entry.
2. [Sales report](screenshots/02-sales-report.png): revenue, order metrics, daily trend, and leading products.
3. [Issues](screenshots/03-issues.png): original row references, exclusion codes, explanations, and exports.
4. [Changes](screenshots/04-changes.png): accepted values normalized during processing.
5. [Import](screenshots/05-import.png): explicit currency selection and file requirements.
6. [Mobile report](screenshots/06-mobile-report.png): the same workflow at 375 px.

Suggested walkthrough: Explore demo → Example with issues → Issues → Changes → download the source → import it with USD selected → download cleaned CSV/XLSX → reopen the result from history.

## Stack

React, TypeScript, Vite, Tailwind CSS, Recharts; Python, FastAPI, pandas, openpyxl, SQLAlchemy, Alembic, PostgreSQL. Pytest and Vitest cover processing and user interactions; Ruff, mypy, ESLint, TypeScript, and CI check the code. Docker Compose and a native setup support local review.

## Boundaries

Local single-user use only: no authentication or private tenant storage. Maximum upload: 5 MB / 10,000 rows, one currency and one worksheet per file. Identical real items cannot be distinguished from copied rows without a line ID, so the report asks the user to review them. No currency conversion, tax calculation, refunds, or background jobs. Raw files are not saved; validated records and reports are retained. No public demo has been deployed.

See [QA notes](QA.md) for checks actually executed and their limits.
