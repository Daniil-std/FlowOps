import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { runWorker } from '../processing/client';
import type { WorkerResponse } from '../processing/protocol';

class WorkerStub {
  static last: WorkerStub;
  onmessage?: (event: { data: WorkerResponse }) => void;
  onerror?: (event: { preventDefault: () => void }) => void;
  onmessageerror?: () => void;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() {
    WorkerStub.last = this;
  }
}
const request = () => ({
  kind: 'import' as const,
  file: new File(['data'], 'orders.csv'),
  currency: 'USD' as const,
});
beforeEach(() => {
  vi.stubGlobal('Worker', WorkerStub);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('terminates on cancellation and ignores a late result', async () => {
  const controller = new AbortController(),
    progress = vi.fn();
  const promise = runWorker(request(), controller.signal, progress);
  const worker = WorkerStub.last;
  worker.onmessage?.({ data: { kind: 'progress', value: 35 } });
  expect(progress).toHaveBeenCalledWith(35);
  controller.abort();
  await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  expect(worker.terminate).toHaveBeenCalledOnce();
  worker.onmessage?.({ data: { kind: 'download', blob: new Blob() } });
  await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
});

it('reports worker load errors and terminates the worker', async () => {
  const promise = runWorker(request());
  WorkerStub.last.onerror?.({ preventDefault: vi.fn() });
  await expect(promise).rejects.toThrow(/stopped unexpectedly/);
  expect(WorkerStub.last.terminate).toHaveBeenCalledOnce();
});

it('times out a stuck worker without leaving it running', async () => {
  vi.useFakeTimers();
  const promise = runWorker(request());
  const assertion = expect(promise).rejects.toThrow(/took too long/);
  await vi.advanceTimersByTimeAsync(60_000);
  await assertion;
  expect(WorkerStub.last.terminate).toHaveBeenCalledOnce();
});

it('explains unsupported worker environments', async () => {
  vi.stubGlobal(
    'Worker',
    class {
      constructor() {
        throw new Error('Blocked');
      }
    },
  );
  await expect(runWorker(request())).rejects.toThrow(/Web Workers enabled/);
});
