import { Download } from 'lucide-react';
import { useState } from 'react';
import { downloadFile } from '../api';
import { ErrorNotice } from './Status';

export function DemoBanner({ kind }: { kind: 'clean' | 'issues' }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    setError('');
    try {
      await downloadFile(`/demos/${kind}/source`, `flowops-demo-${kind}-USD.csv`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not download the source file.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="demo-banner" aria-label="Fictional demo">
      <div>
        <strong>Fictional stationery shop · USD</strong>
        <p>
          This report uses the same processor as your uploads. Exploring it never adds an import to
          your history.
        </p>
      </div>
      <div className="demo-actions">
        <a
          href="#/demo/clean"
          className="button button-secondary"
          aria-current={kind === 'clean' ? 'page' : undefined}
        >
          Clean example
        </a>
        <a
          href="#/demo/issues"
          className="button button-secondary"
          aria-current={kind === 'issues' ? 'page' : undefined}
        >
          Example with issues
        </a>
        <button className="button button-secondary" disabled={busy} onClick={() => void download()}>
          <Download size={15} />
          {busy ? 'Downloading…' : 'Source CSV'}
        </button>
      </div>
      {kind === 'issues' && (
        <p>
          Open <strong>Issues</strong> for excluded duplicates, invalid values, and conflicting
          orders. Open <strong>Changes</strong> to inspect accepted normalizations.
        </p>
      )}
      {error && <ErrorNotice message={error} />}
    </section>
  );
}
