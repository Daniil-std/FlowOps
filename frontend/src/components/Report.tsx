import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  FileCheck2,
  ListFilter,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import { downloadFile } from '../api';
import { money, number } from '../format';
import type { ImportDetail } from '../types';
import { ErrorNotice } from './Status';

type Tab = 'data' | 'issues' | 'changes';

export function Report({
  job,
  resource = `/imports/${job.id}`,
}: {
  job: ImportDetail;
  resource?: string;
}) {
  const [tab, setTab] = useState<Tab>('data');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const filtered = job.records.filter((record) =>
    [record.order_id, record.customer, record.product].some((value) =>
      value.toLowerCase().includes(search.toLowerCase()),
    ),
  );
  const rows = tab === 'data' ? filtered : tab === 'issues' ? job.issues : job.changes;
  const pageCount = Math.max(1, Math.ceil(rows.length / 10));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * 10;

  function switchTab(next: Tab) {
    setTab(next);
    setPage(0);
  }
  async function download(format: 'csv' | 'xlsx' | 'issues') {
    setDownloading(true);
    setError('');
    try {
      await downloadFile(
        format === 'issues' ? `${resource}/issues.csv` : `${resource}/export/${format}`,
        format === 'issues'
          ? `flowops-${job.id}-issues.csv`
          : `flowops-${job.id}-${job.currency ?? 'unspecified'}-cleaned.${format}`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="card report-card">
      <div className="card-heading">
        <div>
          <h2>Processing report</h2>
          <p>A complete view of what we kept, changed, and removed.</p>
        </div>
        <div className="export-actions">
          <button
            className="button button-secondary button-small"
            disabled={downloading}
            onClick={() => void download('issues')}
          >
            <Download size={15} />
            Issues CSV
          </button>
          <button
            className="button button-secondary button-small"
            disabled={!job.valid_rows || downloading}
            onClick={() => void download('csv')}
          >
            <Download size={15} />
            CSV
          </button>
          <button
            className="button button-secondary button-small"
            disabled={!job.valid_rows || downloading}
            onClick={() => void download('xlsx')}
          >
            <Download size={15} />
            XLSX
          </button>
        </div>
      </div>
      {downloading && (
        <p className="policy-note" role="status">
          Preparing download…
        </p>
      )}
      {!job.valid_rows && (
        <div className="recovery-panel">
          <strong>No rows can be exported yet.</strong>
          <p>
            Download the issues list, correct the original file, and run a new import. This report
            stays available for reference.
          </p>
          <a href="#/import" className="button button-primary">
            Fix file & import again
          </a>
        </div>
      )}
      <details className="policy-note">
        <summary>How duplicates and order conflicts are handled</summary>
        <p>
          {job.processing_version < 2
            ? 'This legacy report compared exact rows before normalization. Reimport the original file to apply the current policy.'
            : 'Rows are compared after trimming whitespace and normalizing dates and numbers. We keep the first matching row and exclude subsequent matches as potential duplicates. Identical real items are ambiguous without a line ID: combine their quantities in the source file and import again. Different products or quantities remain separate. An order ID with different dates or customers excludes all of its rows until corrected. Names and IDs remain case-sensitive; we do not guess that similar names belong to the same customer.'}
        </p>
      </details>
      <div className="report-summary">
        {[
          ['Rows received', job.total_rows, ''],
          ['Valid rows', job.valid_rows, 'good'],
          ['Duplicates removed', job.duplicate_rows, ''],
          ['Invalid rows excluded', job.invalid_rows, 'warning'],
          ['Rows normalized', job.normalized_rows, ''],
        ].map(([label, value, className]) => (
          <div key={label}>
            <span>{label}</span>
            <strong className={String(className)}>{number(Number(value))}</strong>
          </div>
        ))}
      </div>
      {error && (
        <div className="report-notice">
          <ErrorNotice message={error} />
        </div>
      )}
      <div className="report-toolbar">
        <div
          className="report-tabs"
          role="tablist"
          aria-label="Processing report"
          onKeyDown={(event) => {
            const tabs: Tab[] = ['data', 'issues', 'changes'];
            const current = tabs.indexOf(tab);
            const next =
              event.key === 'ArrowRight'
                ? (current + 1) % 3
                : event.key === 'ArrowLeft'
                  ? (current + 2) % 3
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? 2
                      : -1;
            if (next < 0) return;
            event.preventDefault();
            switchTab(tabs[next]);
            document.getElementById(`tab-${tabs[next]}`)?.focus();
          }}
        >
          <button
            id="tab-data"
            aria-controls="report-panel"
            className={tab === 'data' ? 'selected' : ''}
            role="tab"
            aria-selected={tab === 'data'}
            tabIndex={tab === 'data' ? 0 : -1}
            onClick={() => switchTab('data')}
          >
            <FileCheck2 size={16} />
            Cleaned data<span>{number(job.valid_rows)}</span>
          </button>
          <button
            id="tab-issues"
            aria-controls="report-panel"
            className={tab === 'issues' ? 'selected' : ''}
            role="tab"
            aria-selected={tab === 'issues'}
            tabIndex={tab === 'issues' ? 0 : -1}
            onClick={() => switchTab('issues')}
          >
            <CircleAlert size={16} />
            Issues<span>{number(job.issues.length)}</span>
          </button>
          <button
            id="tab-changes"
            aria-controls="report-panel"
            className={tab === 'changes' ? 'selected' : ''}
            role="tab"
            aria-selected={tab === 'changes'}
            tabIndex={tab === 'changes' ? 0 : -1}
            onClick={() => switchTab('changes')}
          >
            <CheckCheck size={16} />
            Changes<span>{number(job.changes.length + job.column_changes.length)}</span>
          </button>
        </div>
        {tab === 'data' && (
          <label className="search-field">
            <Search size={15} />
            <input
              aria-label="Search cleaned data"
              placeholder="Search order, customer, product…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
          </label>
        )}
      </div>
      <div id="report-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === 'changes' && job.column_changes.length > 0 && (
          <div className="column-changes">
            {job.column_changes.map((message) => (
              <p key={message}>
                <CheckCheck size={14} />
                {message}
              </p>
            ))}
          </div>
        )}
        {tab === 'data' ? (
          filtered.length ? (
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Cleaned order lines"
            >
              <table>
                <thead>
                  <tr>
                    <th>Source row</th>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th className="numeric">Quantity</th>
                    <th className="numeric">Unit price {job.currency}</th>
                    <th className="numeric">Revenue {job.currency}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(start, start + 10).map((row) => (
                    <tr key={row.source_row}>
                      <td className="muted">{row.source_row}</td>
                      <td className="order-id">{row.order_id}</td>
                      <td className="nowrap">{row.date}</td>
                      <td>{row.customer}</td>
                      <td>{row.product}</td>
                      <td className="numeric">{number(row.quantity)}</td>
                      <td className="numeric">{money(row.unit_price, job.currency)}</td>
                      <td className="numeric">
                        {money(
                          (row.quantity * Math.round(Number(row.unit_price) * 100)) / 100,
                          job.currency,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="report-empty">
              <Search size={24} />
              <h3>{search ? 'No matching order lines' : 'No valid rows to show'}</h3>
              <p>
                {search
                  ? 'Try a different order, customer, or product.'
                  : 'Review the issues, correct the original file, and import it again.'}
              </p>
            </div>
          )
        ) : rows.length ? (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label={tab === 'issues' ? 'Validation issues' : 'Normalization changes'}
          >
            <table className="issues-table">
              <thead>
                <tr>
                  <th>Source row</th>
                  <th>Column</th>
                  <th>Code</th>
                  <th>{tab === 'issues' ? 'Reason for exclusion' : 'Change made'}</th>
                </tr>
              </thead>
              <tbody>
                {(tab === 'issues' ? job.issues : job.changes)
                  .slice(start, start + 10)
                  .map((issue, index) => (
                    <tr key={`${issue.row}-${issue.column}-${index}`}>
                      <td>
                        <span className="row-pill">Row {issue.row}</span>
                      </td>
                      <td>
                        <code>{issue.column}</code>
                      </td>
                      <td>
                        <code>{issue.code}</code>
                      </td>
                      <td>{issue.message}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="report-empty">
            <CheckCheck size={25} />
            <h3>{tab === 'issues' ? 'All clear. Every row passed.' : 'No row changes needed'}</h3>
            <p>
              {tab === 'issues'
                ? 'No invalid rows, potential duplicates, or order conflicts were found.'
                : 'The accepted rows already use the expected format.'}
            </p>
          </div>
        )}
      </div>
      <div className="pagination">
        <span>
          {rows.length
            ? `${start + 1}–${Math.min(start + 10, rows.length)} of ${number(rows.length)} ${tab === 'data' ? 'rows' : 'entries'}`
            : '0 entries'}
        </span>
        <div>
          <button
            className="icon-button"
            aria-label="Previous report page"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            {currentPage + 1} / {pageCount}
          </span>
          <button
            className="icon-button"
            aria-label="Next report page"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="report-footnote">
        <ListFilter size={14} />
        <span>
          Source rows refer to the original file, including its header. CSV exports prefix
          formula-like text with an apostrophe; XLSX exports keep it as literal text. Export
          filenames include the selected currency; cleaned files keep the six-column input schema.
          Select that same currency if reimporting.
        </span>
      </div>
    </section>
  );
}
