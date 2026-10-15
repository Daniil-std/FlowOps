import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  FileSpreadsheet,
  FileUp,
  Info,
  LoaderCircle,
  UploadCloud,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { downloadFile, exampleFile, upload } from '../api';
import { fileSize } from '../format';
import type { Currency, ImportDetail } from '../types';
import { ErrorNotice } from './Status';

const MAX_SIZE = 5 * 1024 * 1024;
export function UploadView({
  onComplete,
  useExample,
}: {
  onComplete: (result: ImportDetail) => void;
  useExample: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [currency, setCurrency] = useState<Currency | ''>('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingExample, setLoadingExample] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!useExample) return;
    let active = true;
    exampleFile()
      .then((value) => {
        if (active) setFile(value);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [useExample]);

  function selectFile(selected?: File) {
    if (!selected || busy) return;
    setError('');
    setFile(null);
    if (!/\.(csv|xlsx)$/i.test(selected.name))
      return setError('Choose a CSV or XLSX file. Other formats are not supported.');
    if (selected.size > MAX_SIZE)
      return setError('This file is too large. Choose a file of 5 MB or smaller.');
    if (selected.size === 0)
      return setError('This file is empty. Add some order lines and try again.');
    setFile(selected);
  }

  async function process() {
    if (!file || !currency || busy) return;
    setBusy(true);
    setError('');
    setProgress(0);
    try {
      onComplete(await upload(file, currency, setProgress));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The import failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function sample(download: boolean) {
    setLoadingExample(true);
    setError('');
    try {
      if (download) await downloadFile('/sample', 'flowops-example.csv');
      else setFile(await exampleFile());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load the example.');
    } finally {
      setLoadingExample(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A FRESH START FOR YOUR SPREADSHEETS</p>
          <h1>Import your sales data</h1>
          <p>Bring your order lines. We’ll help you make sense of the details.</p>
        </div>
      </div>
      <div className="import-grid">
        <section className="card upload-card">
          <div className="card-heading">
            <div>
              <h2>Upload a spreadsheet</h2>
              <p>Your original file is never changed.</p>
            </div>
            <span className="step-tag">STEP 01 / 02</span>
          </div>
          <div className="upload-body">
            <label className="currency-field" htmlFor="currency">
              File currency
              <select
                id="currency"
                value={currency}
                disabled={busy}
                required
                onChange={(event) => setCurrency(event.target.value as Currency | '')}
                aria-describedby="currency-help"
              >
                <option value="">Choose a currency</option>
                <option value="USD">USD — US dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — Pound sterling</option>
                <option value="PLN">PLN — Polish zloty</option>
              </select>
            </label>
            <p id="currency-help" className="currency-help">
              Choose the currency used by every price in this file. No conversion or automatic
              detection. Split mixed-currency files before importing. The fictional example uses
              USD.
            </p>
            <div
              className={`dropzone ${dragging ? 'is-dragging' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (event.dataTransfer.files.length > 1) setError('Choose one file at a time.');
                else selectFile(event.dataTransfer.files[0]);
              }}
            >
              <span className="upload-icon">
                <UploadCloud size={29} strokeWidth={1.5} />
              </span>
              <h3>Drop your sales file here</h3>
              <p>or browse files on your computer</p>
              <input
                ref={input}
                className="sr-only"
                id="dataset"
                tabIndex={-1}
                type="file"
                accept=".csv,.xlsx"
                aria-label="Sales spreadsheet"
                disabled={busy}
                onChange={(event) => {
                  selectFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <button
                className="button button-secondary"
                onClick={() => input.current?.click()}
                disabled={busy}
              >
                <FileUp size={16} />
                Choose file
              </button>
              <span className="file-hint">
                CSV or XLSX <span>·</span> Up to 5 MB <span>·</span> 10,000 rows
              </span>
            </div>
            {file && (
              <div className="selected-file">
                <span className="file-icon">
                  <FileSpreadsheet size={23} />
                </span>
                <div>
                  <strong>{file.name}</strong>
                  <span>
                    {fileSize(file.size)} · {busy ? 'Processing your file' : 'Ready to import'}
                  </span>
                </div>
                {!busy && (
                  <button
                    className="icon-button"
                    aria-label="Remove selected file"
                    onClick={() => setFile(null)}
                  >
                    <X size={17} />
                  </button>
                )}
              </div>
            )}
            {error && <ErrorNotice message={error} />}
            {busy && (
              <div className="upload-progress" role="status">
                <div className="progress-caption">
                  <span>
                    {progress < 100 ? 'Uploading file…' : 'Validating and processing your data…'}
                  </span>
                  {progress < 100 && <span>{progress}%</span>}
                </div>
                <progress
                  max={100}
                  value={progress < 100 ? progress : undefined}
                  aria-label={progress < 100 ? 'Upload progress' : 'Processing'}
                />
              </div>
            )}
            <div className="upload-actions">
              <span>
                <ShieldNote /> Raw uploads aren’t retained.
              </span>
              <button
                className="button button-primary"
                disabled={!file || !currency || busy || loadingExample}
                onClick={() => void process()}
              >
                {busy ? <LoaderCircle size={16} className="spin" /> : null}
                {busy ? 'Processing…' : 'Import & process'}
                {!busy && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
          <div className="upload-footnote">
            <Info size={15} />
            <span>Invalid rows are excluded and explained. Nothing is filled in by guessing.</span>
          </div>
        </section>
        <aside className="import-help">
          <section className="card format-card">
            <div className="card-heading">
              <div>
                <h2>A simple, consistent format</h2>
                <p>One row per order item. Six required columns.</p>
              </div>
            </div>
            <dl>
              {[
                ['order_id', 'Order reference; can repeat for different items'],
                ['date', 'YYYY-MM-DD or YYYY/MM/DD'],
                ['customer', 'Customer name or fictional label'],
                ['product', 'Product name'],
                ['quantity', 'Positive whole number'],
                ['unit_price', 'Non-negative price, up to 2 decimal places'],
              ].map(([name, description]) => (
                <div key={name}>
                  <dt>
                    <code>{name}</code>
                  </dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
            <p className="format-note">
              Column names ignore casing and surrounding spaces. The currency you select applies to
              every row in this import.
            </p>
            <details>
              <summary>More about accepted values</summary>
              <p>
                UTF-8 CSV with comma separators, or one-sheet XLSX. Use decimal points (19.95);
                thousands separators are accepted only with a decimal part (1,234.50). Quantity and
                unit price must each be at most 1,000,000. Text values may contain up to 200
                characters. Excel dates are supported; formulas and non-midnight timestamps are
                excluded.
              </p>
            </details>
          </section>
          <section className="example-card">
            <span className="example-icon">
              <FileSpreadsheet size={21} />
            </span>
            <h3>Take it for a test run</h3>
            <p>48 fictional order lines from a small stationery shop. Ready to explore.</p>
            <div>
              <button
                className="text-button"
                disabled={busy || loadingExample}
                onClick={() => void sample(false)}
              >
                Use example data <ArrowRight size={14} />
              </button>
              <button
                className="icon-button"
                aria-label="Download example CSV"
                title="Download example CSV"
                disabled={busy || loadingExample}
                onClick={() => void sample(true)}
              >
                <ArrowDownToLine size={17} />
              </button>
            </div>
          </section>
        </aside>
      </div>
      <div className="process-steps">
        {[
          ['01', 'Bring your data', 'Upload a CSV or Excel file.'],
          ['02', 'Review the details', 'See what changed and what needs attention.'],
          ['03', 'Get a clearer picture', 'Explore your sales and export clean data.'],
        ].map(([step, title, text]) => (
          <div key={step}>
            <span>{step}</span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ShieldNote() {
  return <Check size={14} />;
}
