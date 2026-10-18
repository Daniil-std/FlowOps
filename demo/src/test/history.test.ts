// @vitest-environment node
import 'fake-indexeddb/auto';
import { beforeEach, expect, it, vi } from 'vitest';
import { processFile } from '../processing/processor';
import { clearReports, deleteReport, listReports, loadReport, saveReport } from '../history';

const report = () =>
  processFile(
    new TextEncoder().encode(
      'order_id,date,customer,product,quantity,unit_price\n1,2026-01-01,A,Book,1,2',
    ),
    'orders.csv',
    'USD',
  );
beforeEach(async () => {
  await clearReports();
});

it('keeps the latest ten, reopens after module reload, deletes one and clears all', async () => {
  const reports = Array.from({ length: 12 }, (_, i) => {
    const result = report();
    result.job.created_at = new Date(2026, 0, i + 1).toISOString();
    return result;
  });
  for (const result of reports) await saveReport(result);
  expect((await listReports()).map((item) => item.job.id)).toEqual(
    reports
      .slice(2)
      .reverse()
      .map((item) => item.job.id),
  );
  vi.resetModules();
  const reopened = await import('../history');
  expect(await reopened.loadReport(reports[11].job.id)).toEqual(reports[11]);
  await expect(reopened.loadReport(reports[0].job.id)).rejects.toThrow(/no longer/);
  await deleteReport(reports[11].job.id);
  await expect(loadReport(reports[11].job.id)).rejects.toThrow(/no longer/);
  expect(await listReports()).toHaveLength(9);
  await clearReports();
  expect(await listReports()).toEqual([]);
});

it('keeps a usable session report when IndexedDB cannot save', async () => {
  const result = report();
  vi.spyOn(indexedDB, 'open').mockImplementation(() => {
    throw new DOMException('Denied', 'SecurityError');
  });
  await expect(saveReport(result)).rejects.toThrow(/unavailable/);
  expect(await loadReport(result.job.id)).toEqual(result);
  await expect(listReports()).rejects.toThrow(/unavailable/);
});
