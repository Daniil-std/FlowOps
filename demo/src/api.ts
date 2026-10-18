import { loadReport } from './history';
import { exportInBrowser } from './processing/client';

async function errorMessage(response: Response): Promise<string> {
  return `Could not load the demo file (${response.status}). Please try again.`;
}

export async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const local = /^\/imports\/([^/]+)(\/analytics)?$/.exec(path);
  if (local) {
    const report = await loadReport(local[1]);
    return (local[2] ? report.analytics : report.job) as T;
  }
  const match = /^\/demos\/(clean|issues)(\/analytics)?$/.exec(path);
  if (!match) throw new Error('This report could not be found.');
  const response = await fetch(`/demo/${match[1]}${match[2] ? '-analytics' : ''}.json`, { signal });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json() as Promise<T>;
}

export async function downloadFile(path: string, filename: string): Promise<void> {
  const local = /^\/imports\/([^/]+)\/(issues\.csv|export\/(csv|xlsx))$/.exec(path);
  if (local) {
    const { job } = await loadReport(local[1]);
    saveBlob(
      await exportInBrowser(
        job,
        local[2] === 'issues.csv' ? 'issues' : (local[3] as 'csv' | 'xlsx'),
      ),
      filename,
    );
    return;
  }
  const match = /^\/demos\/(clean|issues)\/(source|issues\.csv|export\/(csv|xlsx))$/.exec(path);
  if (!match) throw new Error('Downloads are available for demo examples only.');
  const suffix =
    match[2] === 'source'
      ? 'source.csv'
      : match[2] === 'issues.csv'
        ? 'issues.csv'
        : `cleaned.${match[3]}`;
  const response = await fetch(`/demo/${match[1]}-${suffix}`);
  if (!response.ok) throw new Error(await errorMessage(response));
  saveBlob(await response.blob(), filename);
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exampleFile(): Promise<File> {
  const response = await fetch('/demo/clean-source.csv');
  if (!response.ok) throw new Error(await errorMessage(response));
  return new File([await response.blob()], 'flowops-example-USD.csv', { type: 'text/csv' });
}
