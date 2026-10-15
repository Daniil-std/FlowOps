import { useEffect, useState } from 'react';
import { getHistory } from '../api';
import type { ImportPage } from '../types';
import { History } from './History';
import { ErrorNotice, Loading } from './Status';

export function HistorySection({ compact = false }: { compact?: boolean }) {
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  return (
    <HistoryRequest
      key={`${offset}-${attempt}`}
      offset={offset}
      compact={compact}
      onPage={setOffset}
      retry={() => setAttempt((value) => value + 1)}
    />
  );
}

function HistoryRequest({
  offset,
  compact,
  onPage,
  retry,
}: {
  offset: number;
  compact: boolean;
  onPage: (offset: number) => void;
  retry: () => void;
}) {
  const [history, setHistory] = useState<ImportPage>();
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    getHistory(offset, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setHistory(value);
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [offset]);
  if (error)
    return (
      <section aria-label="Import history">
        <ErrorNotice message={`History could not be loaded. ${error}`} retry={retry} />
      </section>
    );
  if (!history)
    return (
      <section className="history-loading" aria-label="Import history">
        <Loading label="Loading imports…" />
      </section>
    );
  return <History history={history} compact={compact} onPage={onPage} />;
}
