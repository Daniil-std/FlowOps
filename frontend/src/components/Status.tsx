import { Check, CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
import type { ImportSummary } from '../types';

export function Status({ status }: { status: ImportSummary['status'] }) {
  const labels = { ready: 'Ready', needs_review: 'Needs review', no_valid_rows: 'No valid rows' };
  return (
    <span className={`status status-${status}`}>
      {status === 'ready' ? <Check size={12} /> : <CircleAlert size={12} />}
      {labels[status]}
    </span>
  );
}

export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="notice notice-error" role="alert">
      <CircleAlert size={18} />
      <div>
        {message}
        {retry && (
          <button className="text-button" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function Loading({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={24} />
      <p>{label}</p>
    </div>
  );
}

export function Success({ children }: { children: React.ReactNode }) {
  return (
    <div className="notice notice-success" role="status">
      <CircleCheck size={18} />
      <div>{children}</div>
    </div>
  );
}
