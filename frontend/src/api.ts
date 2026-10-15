import type { Analytics, Currency, ImportDetail, ImportPage } from './types';

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.detail?.message ?? 'The request could not be completed. Please try again.';
  } catch {
    return 'The server is unavailable. Check that the backend is running.';
  }
}

export async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api${path}`, { signal });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json() as Promise<T>;
}

export const getHistory = (offset = 0, signal?: AbortSignal) =>
  get<ImportPage>(`/imports?limit=10&offset=${offset}`, signal);
export const getImport = (id: string, signal?: AbortSignal) =>
  get<ImportDetail>(`/imports/${id}`, signal);
export const getAnalytics = (id: string, signal?: AbortSignal) =>
  get<Analytics>(`/imports/${id}/analytics`, signal);

export function upload(
  file: File,
  currency: Currency,
  onProgress: (progress: number) => void,
): Promise<ImportDetail> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/imports');
    request.responseType = 'json';
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300 && request.response?.id)
        resolve(request.response);
      else
        reject(
          new Error(
            request.response?.detail?.message ??
              'Import failed. Check that the backend is running and try again.',
          ),
        );
    };
    request.onerror = () =>
      reject(new Error('Could not reach the server. Check your connection and try again.'));
    const form = new FormData();
    form.append('file', file);
    form.append('currency', currency);
    request.send(form);
  });
}

export async function downloadFile(path: string, filename: string): Promise<void> {
  const response = await fetch(`/api${path}`);
  if (!response.ok) throw new Error(await errorMessage(response));
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exampleFile(): Promise<File> {
  const response = await fetch('/api/sample');
  if (!response.ok) throw new Error(await errorMessage(response));
  return new File([await response.blob()], 'flowops-example.csv', { type: 'text/csv' });
}
