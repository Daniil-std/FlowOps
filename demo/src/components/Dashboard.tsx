import { ArrowRight, Check, FileSpreadsheet, Layers3, ShieldCheck } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { get } from '../api';
import { dateTime, number } from '../format';
import type { Analytics, ImportDetail } from '../types';
import { DemoBanner } from './DemoBanner';
import { Report } from './Report';
import { ErrorNotice, Loading, Status, Success } from './Status';
import { Stats } from './Stats';

const Charts = lazy(() => import('./Charts').then((module) => ({ default: module.Charts })));

export function Dashboard({
  importId,
  justImported,
  demo,
}: {
  importId?: string;
  justImported: boolean;
  demo?: 'clean' | 'issues';
}) {
  const resource = demo ? `/demos/${demo}` : importId ? `/imports/${importId}` : undefined;
  const [result, setResult] = useState<{ job: ImportDetail; analytics: Analytics }>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!resource) return;
    const controller = new AbortController();
    Promise.all([
      get<ImportDetail>(resource, controller.signal),
      get<Analytics>(`${resource}/analytics`, controller.signal),
    ])
      .then(([job, analytics]) => {
        if (!controller.signal.aborted) setResult({ job, analytics });
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [resource, attempt]);
  if (error)
    return (
      <ErrorNotice
        message={error}
        retry={() => {
          setError('');
          setAttempt(attempt + 1);
        }}
      />
    );
  if (resource && !result) return <Loading label="Opening your report…" />;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR SALES, WITH A LITTLE MORE CLARITY</p>
          <h1>{result ? 'Your sales overview' : 'Good data. Clear decisions.'}</h1>
          <p>
            {result
              ? 'A closer look at the numbers in this import.'
              : 'Turn everyday spreadsheets into a clearer view of your business.'}
          </p>
        </div>
        <div className="heading-actions">
          <a href="#/demo/clean" className="button button-secondary">
            Explore demo
          </a>
          <a href="#/demo/issues" className="button button-primary">Example with issues</a>
        </div>
      </div>
      {demo && <DemoBanner kind={demo} />}
      {result && result.job.processing_version < 2 && (
        <div className="notice notice-warning">
          Legacy report: duplicates were compared before normalization. Reimport the original file
          to apply the current review policy and choose a currency. Existing results have not been
          recalculated.
        </div>
      )}
      {justImported && result && (
        <Success>
          Import complete. {number(result.job.valid_rows)} of {number(result.job.total_rows)} rows
          are ready.
          {result.job.issues.length > 0
            ? ' Review the excluded rows below.'
            : ' Your sales overview is ready to explore.'}
        </Success>
      )}
      {result ? (
        <div className="dataset-bar">
          <span className="file-icon small">
            <FileSpreadsheet size={20} />
          </span>
          <div>
            <strong>{result.job.filename}</strong>
            <span>
              {demo ? 'Prepared example' : `Imported ${dateTime(result.job.created_at)}`} ·{' '}
              {number(result.job.valid_rows)} validated order lines ·{' '}
              {result.job.currency ?? 'Currency unspecified (legacy)'}
            </span>
          </div>
          <Status status={result.job.status} />
        </div>
      ) : (
        <section className="welcome-card">
          <div className="welcome-content">
            <span className="pill-label">
              <span className="online-dot" /> LET’S GET YOUR DATA READY
            </span>
            <h2>
              Less tidying.
              <br />
              More understanding.
            </h2>
            <p>
              Upload your sales spreadsheet. Find the messy rows,
              <br className="desktop-break" /> keep the useful ones, and see the bigger picture.
            </p>
            <div className="welcome-actions">
              <a href="#/demo/clean" className="button button-primary">
                Explore demo <ArrowRight size={16} />
              </a>
              <a href="#/import" className="button button-secondary">
                Upload your first file <ArrowRight size={16} />
              </a>
              <a href="#/demo/issues" className="text-button">
                See an example with issues <ArrowRight size={15} />
              </a>
            </div>
            <div className="welcome-benefits">
              <span>
                <Check size={14} /> CSV & Excel
              </span>
              <span>
                <Check size={14} /> Clear validation
              </span>
              <span>
                <Check size={14} /> Ready-to-use exports
              </span>
            </div>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <div className="art-grid" />
            <div className="paper paper-back" />
            <div className="paper">
              <div className="paper-header">
                <span className="paper-icon">
                  <FileSpreadsheet size={22} />
                </span>
                <span>
                  Sales data<span className="paper-subtitle">A fresh perspective</span>
                </span>
                <span className="paper-check">
                  <Check size={14} />
                </span>
              </div>
              <div className="paper-table">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="paper-footer">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="art-tag">
              <ShieldCheck size={17} />
              Every row accounted for
            </div>
          </div>
        </section>
      )}
      <div className="section-intro">
        <h2>{result ? 'At a glance' : 'Your business at a glance'}</h2>
        <span>
          <Layers3 size={14} />
          {result
            ? `This report only · ${result.job.currency ?? 'currency unspecified'} · no currency conversion`
            : 'Your real data will appear here'}
        </span>
      </div>
      <Stats analytics={result?.analytics} currency={result?.job.currency} />
      <Suspense
        fallback={
          <div className="card chart-loading" role="status">
            Loading charts…
          </div>
        }
      >
        <Charts analytics={result?.analytics} currency={result?.job.currency} />
      </Suspense>
      {result ? (
        <Report key={result.job.id} job={result.job} resource={resource} />
      ) : (
        <div className="getting-started">
          <span className="empty-icon">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h3>Clean data starts with a clear format.</h3>
            <p>Six columns. One item per row. We’ll flag anything that needs your attention.</p>
          </div>
          <a className="text-button" href="#/import">
            See the format <ArrowRight size={15} />
          </a>
        </div>
      )}
    </>
  );
}
