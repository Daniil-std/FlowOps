import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Layout } from './components/Layout';

export default function App() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/demo/clean');
  const page = 'demo';

  useEffect(() => {
    function changeRoute() {
      setRoute(window.location.hash.slice(1) || '/demo/clean');
      window.scrollTo({ top: 0 });
      document.getElementById('main-content')?.focus({ preventScroll: true });
    }
    window.addEventListener('hashchange', changeRoute);
    return () => window.removeEventListener('hashchange', changeRoute);
  }, []);

  const demo = route === '/demo/issues' ? 'issues' : 'clean';
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
        <Dashboard key={demo} demo={demo} justImported={false} />
      </Layout>
    </>
  );
}
