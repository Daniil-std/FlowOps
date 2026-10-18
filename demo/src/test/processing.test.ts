// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { read, utils } from 'xlsx';
import { zipSync, strToU8 } from 'fflate';
import fixtures from './python-fixtures.json';
import { calculateAnalytics, processFile } from '../processing/processor';
import { exportReport } from '../processing/exports';
import { COLUMNS, MAX_BYTES } from '../processing/reading';

const csv = (rows: string[][]) =>
  new TextEncoder().encode([COLUMNS.join(','), ...rows.map((row) => row.join(','))].join('\n'));
const valid = ['001', '2026-09-01', 'Mira', 'Notebook', '2', '18.50'];

describe('Python processor parity', () => {
  for (const fixture of fixtures)
    it(fixture.name, () => {
      const bytes = new Uint8Array(Buffer.from(fixture.content, 'base64'));
      if (fixture.error) {
        expect(() => processFile(bytes, fixture.filename, 'USD')).toThrow(
          expect.objectContaining({ code: fixture.error }),
        );
        return;
      }
      const { job, analytics } = processFile(bytes, fixture.filename, 'USD');
      expect({
        ...job,
        issues: job.issues.map(({ row, column, code }) => ({ row, column, code })),
      }).toMatchObject(fixture.expected!);
      expect(analytics).toEqual(fixture.analytics);
    });
});

it('round trips CSV to report to XLSX with literal text, ids, numbers, and dates', async () => {
  const original = processFile(
    csv([[...valid.slice(0, 2), '=SUM(1)', '@literal', '3', '0.10']]),
    'orders.csv',
    'EUR',
  );
  const blob = exportReport(original.job, 'xlsx');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const book = read(bytes, { type: 'array' });
  const sheet = book.Sheets[book.SheetNames[0]];
  expect(sheet.A2).toMatchObject({ t: 's', v: '001' });
  expect(sheet.C2).toMatchObject({ t: 's', v: '=SUM(1)' });
  expect(sheet.C2.f).toBeUndefined();
  expect(sheet.E2).toMatchObject({ t: 'n', v: 3 });
  expect(sheet.F2).toMatchObject({ t: 'n', v: 0.1 });
  expect(utils.sheet_to_json(sheet)).toHaveLength(1);
  const imported = processFile(bytes, 'cleaned.xlsx', 'EUR');
  expect(imported.job.records).toEqual(original.job.records);
  expect(imported.job.issues).toEqual([]);
  expect(imported.analytics).toEqual(original.analytics);
  expect(await exportReport(original.job, 'csv').text()).toContain("'=SUM(1),'@literal");
  expect(await exportReport(original.job, 'issues').text()).toContain(
    'source_row,column,code,explanation',
  );
});

it('enforces file and row limits, including XLSX expansion', () => {
  expect(() => processFile(new Uint8Array(MAX_BYTES + 1), 'large.csv', 'USD')).toThrow(/5 MB/);
  expect(() =>
    processFile(csv(Array.from({ length: 10_001 }, () => valid)), 'large.csv', 'USD'),
  ).toThrow(/10,000/);
  const bytes = zipSync({
    'xl/workbook.xml': strToU8('<workbook/>'),
    'large.xml': new Uint8Array(50 * 1024 * 1024),
  });
  expect(() => processFile(bytes, 'large.xlsx', 'USD')).toThrow(/expanded workbook/);
});

it('keeps exact cents above the JavaScript safe integer range at 10,000 rows', () => {
  const rows = Array.from({ length: 10_000 }, (_, i) => [
    String(i),
    ...valid.slice(1, 4),
    '1000000',
    '1000000',
  ]);
  const { job, analytics } = processFile(csv(rows), 'max.csv', 'PLN');
  expect(job.valid_rows).toBe(10_000);
  expect(analytics.revenue).toBe('10000000000000000.00');
  expect(analytics.average_order_value).toBe('1000000000000.00');
  job.records[0].unit_price = '999999.99';
  expect(calculateAnalytics(job.records).revenue).toBe('9999999999990000.00');
});
