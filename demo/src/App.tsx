import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Layout } from './components/Layout';
import { UploadView } from './components/UploadView';
import { History } from './components/History';
import { HISTORY_WARNING, rememberReport, saveReport } from './history';
import type { ReportResult } from './types';

export default function App() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/');
  const [storageNotice, setStorageNotice] = useState('');
  const [lastImport, setLastImport] = useState('');
  const demo = route === '/demo/clean' ? 'clean' : route === '/demo/issues' ? 'issues' : undefined;
  const importId = /^\/imports\/([^/]+)$/.exec(route)?.[1];
  const page =
    route === '/import'
      ? 'import'
      : route === '/history'
        ? 'history'
        : demo
          ? 'demo'
          : importId
            ? 'result'
            : 'overview';

  function complete(result: ReportResult) {
    rememberReport(result);
    setLastImport(result.job.id);
    setStorageNotice('Saving this report in browser history…');
    window.location.hash = `/imports/${result.job.id}`;
    void saveReport(result).then(
      () => setStorageNotice(''),
      () => setStorageNotice(HISTORY_WARNING),
    );
  }

  useEffect(() => {
    function changeRoute() {
      setRoute(window.location.hash.slice(1) || '/');
      window.scrollTo({ top: 0 });
      document.getElementById('main-content')?.focus({ preventScroll: true });
    }
    window.addEventListener('hashchange', changeRoute);
    return () => window.removeEventListener('hashchange', changeRoute);
  }, []);

  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to content
      </a>
      <Layout page={page}>
        {storageNotice && (
          <div className="notice notice-warning" role="status">
            {storageNotice}
          </div>
        )}
        {page === 'import' ? (
          <UploadView onComplete={complete} />
        ) : page === 'history' ? (
          <History />
        ) : (
          <Dashboard
            key={route}
            demo={demo}
            importId={importId}
            justImported={lastImport === importId}
          />
        )}
      </Layout>
    </>
  );
}
