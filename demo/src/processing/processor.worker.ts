import { exportReport } from './exports';
import { processFile } from './processor';
import { MAX_BYTES, ImportFailure } from './reading';
import type { WorkerRequest, WorkerResponse } from './protocol';

const send = (response: WorkerResponse) => self.postMessage(response);
self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    if (data.kind === 'export') {
      send({ kind: 'download', blob: exportReport(data.job, data.format) });
      return;
    }
    if (data.file.size > MAX_BYTES)
      throw new ImportFailure('file_too_large', 'Files must be 5 MB or smaller.');
    send({ kind: 'progress', value: 5 });
    const bytes = new Uint8Array(await data.file.arrayBuffer());
    const result = processFile(bytes, data.file.name, data.currency, (value) =>
      send({ kind: 'progress', value }),
    );
    send({ kind: 'report', result });
  } catch (error) {
    send({
      kind: 'error',
      message:
        error instanceof ImportFailure
          ? error.message
          : 'Could not process this file. Check its format and try again.',
    });
  }
};
