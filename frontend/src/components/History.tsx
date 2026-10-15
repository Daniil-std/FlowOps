import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  History as HistoryIcon,
} from 'lucide-react';
import { dateTime, fileSize, number } from '../format';
import type { ImportPage } from '../types';
import { Status } from './Status';

export function History({
  history,
  compact = false,
  onPage,
}: {
  history: ImportPage;
  compact?: boolean;
  onPage?: (offset: number) => void;
}) {
  const items = compact ? history.items.slice(0, 4) : history.items;
  return (
    <section className="card history-card">
      <div className="card-heading">
        <div>
          <h2>
            {compact ? 'Recent imports' : 'All imports'}
            <span className="count-badge">{history.total}</span>
          </h2>
          <p>Every import, with its results ready to revisit.</p>
        </div>
        {compact && history.total > 0 && (
          <a className="text-button" href="#/history">
            View history <ArrowRight size={14} />
          </a>
        )}
      </div>
      {items.length ? (
        <>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Processing history table"
          >
            <table className="history-table">
              <thead>
                <tr>
                  <th>File name</th>
                  <th>Imported</th>
                  <th>Rows</th>
                  <th>Valid</th>
                  <th>Issues</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Open report</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <a className="file-link" href={`#/imports/${job.id}`}>
                        <span className="file-icon small">
                          <FileSpreadsheet size={19} />
                        </span>
                        <span>
                          <strong>{job.filename}</strong>
                          <small>{fileSize(job.file_size)}</small>
                        </span>
                      </a>
                    </td>
                    <td className="muted nowrap">{dateTime(job.created_at)}</td>
                    <td>{number(job.total_rows)}</td>
                    <td>{number(job.valid_rows)}</td>
                    <td>{number(job.issue_count)}</td>
                    <td>
                      <Status status={job.status} />
                    </td>
                    <td>
                      <a
                        className="icon-button"
                        aria-label={`Open ${job.filename}`}
                        href={`#/imports/${job.id}`}
                      >
                        <ArrowRight size={16} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!compact && (
            <div className="pagination">
              <span>
                {history.offset + 1}–{history.offset + items.length} of {number(history.total)}{' '}
                imports
              </span>
              <div>
                <button
                  className="icon-button"
                  aria-label="Previous imports"
                  disabled={history.offset === 0}
                  onClick={() => onPage?.(Math.max(0, history.offset - history.limit))}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Next imports"
                  disabled={history.offset + history.limit >= history.total}
                  onClick={() => onPage?.(history.offset + history.limit)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="history-empty">
          <span className="empty-icon">
            <HistoryIcon size={21} />
          </span>
          <div>
            <h3>Your next import starts the story</h3>
            <p>Processed files and their reports will appear here.</p>
          </div>
          <a href="#/import" className="text-button">
            Import a file <ArrowRight size={15} />
          </a>
        </div>
      )}
    </section>
  );
}
