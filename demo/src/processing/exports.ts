import { utils, write } from 'xlsx';
import type { ImportDetail } from '../types';
import { COLUMNS } from './reading';

export type ExportFormat = 'csv' | 'xlsx' | 'issues';
function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@]/.test(value.trimStart())) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
export function exportReport(job: ImportDetail, format: ExportFormat): Blob {
  if (format === 'xlsx') {
    const sheet = utils.aoa_to_sheet([
      COLUMNS.slice(),
      ...job.records.map((record) =>
        COLUMNS.map((column) =>
          column === 'unit_price' ? Number(record[column]) : record[column],
        ),
      ),
    ]);
    for (let row = 2; row <= job.records.length + 1; row++) sheet[`F${row}`].z = '0.00';
    sheet['!cols'] = [20, 16, 26, 30, 14, 16].map((wch) => ({ wch }));
    sheet['!autofilter'] = { ref: sheet['!ref']! };
    const book = utils.book_new();
    utils.book_append_sheet(book, sheet, 'Cleaned orders');
    return new Blob([write(book, { type: 'array', bookType: 'xlsx', compression: true })], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }
  const rows: (string | number)[][] =
    format === 'issues'
      ? [
          ['source_row', 'column', 'code', 'explanation'],
          ...job.issues.map((issue) => [issue.row, issue.column, issue.code, issue.message]),
        ]
      : [COLUMNS.slice(), ...job.records.map((record) => COLUMNS.map((column) => record[column]))];
  return new Blob(['\ufeff', rows.map((row) => row.map(csvCell).join(',')).join('\r\n'), '\r\n'], {
    type: 'text/csv;charset=utf-8',
  });
}
