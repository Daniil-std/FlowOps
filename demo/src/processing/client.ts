import type { Currency, ImportDetail, ReportResult } from '../types';
import type { ExportFormat } from './exports';
import type { WorkerRequest, WorkerResponse } from './protocol';

export function runWorker(
  request: WorkerRequest,
  signal?: AbortSignal,
  progress?: (value: number) => void,
): Promise<WorkerResponse> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Processing cancelled.', 'AbortError'));
      return;
    }
    let worker: Worker;
    try {
      worker = new Worker(new URL('./processor.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      reject(
        new Error(
          'This browser could not start file processing. Try a current browser with Web Workers enabled.',
        ),
      );
      return;
    }
    const cleanup = () => {
      worker.terminate();
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
    };
    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cancel = () => fail(new DOMException('Processing cancelled.', 'AbortError'));
    const timeout = setTimeout(
      () => fail(new Error('Processing took too long. Try a smaller file or another browser.')),
      60_000,
    );
    signal?.addEventListener('abort', cancel, { once: true });
    worker.onerror = (event) => {
      event.preventDefault();
      fail(new Error('File processing stopped unexpectedly. Reload the page and try again.'));
    };
    worker.onmessageerror = () =>
      fail(new Error('The processing result could not be read. Try again.'));
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      if (data.kind === 'progress') {
        progress?.(data.value);
        return;
      }
      if (data.kind === 'error') {
        fail(new Error(data.message));
        return;
      }
      cleanup();
      resolve(data);
    };
    try {
      worker.postMessage(request);
    } catch {
      fail(new Error('The file could not be opened for processing. Please select it again.'));
    }
  });
}

export async function processInBrowser(
  file: File,
  currency: Currency,
  signal: AbortSignal,
  progress: (value: number) => void,
): Promise<ReportResult> {
  const response = await runWorker({ kind: 'import', file, currency }, signal, progress);
  if (response.kind !== 'report') throw new Error('The report could not be read. Try again.');
  return response.result;
}

export async function exportInBrowser(job: ImportDetail, format: ExportFormat): Promise<Blob> {
  const response = await runWorker({ kind: 'export', job, format });
  if (response.kind !== 'download') throw new Error('The export could not be created. Try again.');
  return response.blob;
}
