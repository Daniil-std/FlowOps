import { FileUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { HistorySection } from './components/HistorySection';
import { Layout } from './components/Layout';
import { UploadView } from './components/UploadView';
import type { ImportDetail } from './types';

export default function App() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/');
  const [lastImport, setLastImport] = useState('');
  const page = route.startsWith('/demo/')
    ? 'demo'
    : route.startsWith('/imports/')
      ? 'result'
      : route.startsWith('/import')
        ? 'import'
        : route === '/history'
          ? 'history'
          : 'overview';

  useEffect(() => {
    function changeRoute() {
      setRoute(window.location.hash.slice(1) || '/');
      window.scrollTo({ top: 0 });
      document.getElementById('main-content')?.focus({ preventScroll: true });
    }
    window.addEventListener('hashchange', changeRoute);
    return () => window.removeEventListener('hashchange', changeRoute);
  }, []);

  function imported(result: ImportDetail) {
    setLastImport(result.id);
    window.location.hash = `/imports/${result.id}`;
  }

  const importId = page === 'result' ? route.split('/')[2] : undefined;
  const demo = page === 'demo' ? (route === '/demo/issues' ? 'issues' : 'clean') : undefined;
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
        {page === 'import' ? (
          <UploadView onComplete={imported} useExample={route.includes('example=1')} />
        ) : page === 'history' ? (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">A RECORD OF THE DETAILS</p>
                <h1>Processing history</h1>
                <p>Pick up where you left off. Your reports and clean exports are saved.</p>
              </div>
              <a className="button button-primary" href="#/import">
                <FileUp size={17} />
                Import data
              </a>
            </div>
            <HistorySection />
          </>
        ) : (
          <Dashboard
            key={demo ?? importId ?? 'empty'}
            demo={demo}
            importId={importId}
            justImported={page === 'result' && lastImport === importId}
          />
        )}
      </Layout>
    </>
  );
}
