import { ArrowRight, FileSpreadsheet, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clearReports, deleteReport, listReports } from '../history';
import { dateTime, fileSize, number } from '../format';
import type { ReportResult } from '../types';
import { ErrorNotice, Loading, Status } from './Status';

export function History() {
  const [reports, setReports] = useState<ReportResult[]>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    listReports().then(
      (items) => {
        if (active) setReports(items);
      },
      (reason: Error) => {
        if (active) setError(reason.message);
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  async function remove(id?: string) {
    if (
      !window.confirm(
        id
          ? 'Delete this report from browser history?'
          : 'Clear all saved reports from this browser? Download any files you want to keep first.',
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      if (id) await deleteReport(id);
      else await clearReports();
      setReports(await listReports());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'History could not be updated. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p>
          <h1>Processing history</h1>
          <p>Your last 10 imports, saved in this browser.</p>
        </div>
        <a href="#/import" className="button button-primary">
          Import your file <ArrowRight size={16} />
        </a>
      </div>
      <div className="notice history-privacy">
        Reports include cleaned rows, issues, and changes. They stay on this device and are not
        synced. Clearing site data or using private browsing may remove them. Download files you
        want to keep.
      </div>
      {error && (
        <ErrorNotice
          message={error}
          retry={() => {
            setError('');
            setAttempt(attempt + 1);
          }}
        />
      )}
      {!reports && !error && <Loading label="Opening browser history…" />}
      {reports && (
        <section className="card history-card">
          <div className="card-heading">
            <div>
              <h2>
                Recent imports <span className="count-badge">{reports.length}</span>
              </h2>
              <p>Opening an example does not add it to this list.</p>
            </div>
            <button
              className="button button-secondary"
              disabled={busy || !reports.length}
              onClick={() => void remove()}
            >
              <Trash2 size={16} />
              Clear history
            </button>
          </div>
          {reports.length ? (
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
                    <th>Currency</th>
                    <th>Rows</th>
                    <th>Valid</th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(({ job }) => (
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
                      <td>{job.currency}</td>
                      <td>{number(job.total_rows)}</td>
                      <td>{number(job.valid_rows)}</td>
                      <td>
                        <Status status={job.status} />
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          disabled={busy}
                          aria-label={`Delete ${job.filename}`}
                          onClick={() => void remove(job.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="history-empty">
              <div>
                <h3>No saved imports yet</h3>
                <p>Import a file to create your first report.</p>
              </div>
              <a href="#/import" className="text-button">
                Import a file <ArrowRight size={15} />
              </a>
            </div>
          )}
        </section>
      )}
    </>
  );
}
