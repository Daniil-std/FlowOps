import type { ReportResult } from './types';

export const HISTORY_LIMIT = 10;
export const HISTORY_WARNING =
  'This browser could not save your history. Your report and downloads still work in this tab. Download what you need before closing or reloading it.';
const DATABASE = 'flowops-browser';
const STORE = 'reports';
const sessionReports = new Map<string, ReportResult>();

export function rememberReport(report: ReportResult) {
  sessionReports.set(report.job.id, report);
  while (sessionReports.size > HISTORY_LIMIT)
    sessionReports.delete(sessionReports.keys().next().value!);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    let settled = false;
    const timer = setTimeout(() => fail(), 5000);
    const fail = () => {
      settled = true;
      clearTimeout(timer);
      reject(
        new Error('Browser history is unavailable. Allow site storage or try another browser.'),
      );
    };
    try {
      request = indexedDB.open(DATABASE, 1);
    } catch {
      fail();
      return;
    }
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'job.id' });
      store.createIndex('created', 'job.created_at');
    };
    request.onerror = fail;
    request.onblocked = fail;
    request.onsuccess = () => {
      clearTimeout(timer);
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, result: (value: T) => void) => void,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let value: T;
      const timeout = setTimeout(() => {
        tx.abort();
      }, 5000);
      tx.oncomplete = () => {
        clearTimeout(timeout);
        resolve(value);
      };
      tx.onabort = tx.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Browser history could not be updated. Storage may be full or disabled.'));
      };
      try {
        action(tx.objectStore(STORE), (next) => {
          value = next;
        });
      } catch (error) {
        clearTimeout(timeout);
        tx.abort();
        reject(error);
      }
    });
  } finally {
    db.close();
  }
}

export async function saveReport(report: ReportResult): Promise<void> {
  rememberReport(report);
  await transaction<void>('readwrite', (store) => {
    store.put(report);
    let count = 0;
    const request = store.index('created').openCursor(null, 'prev');
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (++count > HISTORY_LIMIT) cursor.delete();
      cursor.continue();
    };
  });
}

export async function listReports(): Promise<ReportResult[]> {
  return transaction<ReportResult[]>('readonly', (store, result) => {
    const request = store.getAll();
    request.onsuccess = () =>
      result(
        (request.result as ReportResult[]).sort((a, b) =>
          b.job.created_at.localeCompare(a.job.created_at),
        ),
      );
  });
}

export async function loadReport(id: string): Promise<ReportResult> {
  const cached = sessionReports.get(id);
  if (cached) return cached;
  const report = await transaction<ReportResult | undefined>('readonly', (store, result) => {
    const request = store.get(id);
    request.onsuccess = () => result(request.result as ReportResult | undefined);
  });
  if (!report)
    throw new Error(
      'This report is no longer in browser history. It may have been deleted or replaced by a newer import. Import the original file again.',
    );
  return report;
}

export async function deleteReport(id: string): Promise<void> {
  await transaction<void>('readwrite', (store) => {
    store.delete(id);
  });
  sessionReports.delete(id);
}

export async function clearReports(): Promise<void> {
  await transaction<void>('readwrite', (store) => {
    store.clear();
  });
  sessionReports.clear();
}
