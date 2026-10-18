import { unzipSync } from 'fflate';
import { XMLValidator } from 'fast-xml-parser';
import { read, utils, type CellObject } from 'xlsx';

export const COLUMNS = [
  'order_id',
  'date',
  'customer',
  'product',
  'quantity',
  'unit_price',
] as const;
export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 10_000;
const MAX_EXPANDED_BYTES = 50 * 1024 * 1024;

export class ImportFailure extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ImportFailure';
  }
}

export interface Sheet {
  rows: string[][];
  sourceRows: number[];
  formulas: Map<number, number[]>;
  headers: string[];
  columnChanges: string[];
}

const failRows = () => {
  throw new ImportFailure('too_many_rows', 'Files can contain at most 10,000 order lines.');
};
const malformedXlsx = () =>
  new ImportFailure('malformed_xlsx', 'This file is not a readable XLSX workbook.');

// Keep physical source line numbers, including blank rows and quoted newlines.
// This follows Python csv.reader's comma dialect with strict=True.
export function readCsv(text: string): Pick<Sheet, 'rows' | 'sourceRows' | 'formulas'> {
  if (text.includes('\0'))
    throw new ImportFailure('malformed_csv', 'The CSV contains invalid null characters.');
  const rows: string[][] = [];
  const sourceRows: number[] = [];
  let row: string[] = [],
    value = '',
    state: 'start' | 'plain' | 'quoted' | 'closed' = 'start';
  let line = 1,
    startLine = 1,
    pending = false;
  const finish = () => {
    rows.push(pending ? [...row, value] : []);
    sourceRows.push(startLine);
    if (rows.length > MAX_ROWS + 1) failRows();
    row = [];
    value = '';
    state = 'start';
    pending = false;
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const newline = char === '\r' || char === '\n';
    const ending = char === '\r' && text[i + 1] === '\n' ? '\r\n' : char;
    if (state === 'quoted') {
      if (char === '"') state = 'closed';
      else value += newline ? ending : char;
    } else if (state === 'closed' && char === '"') {
      value += '"';
      state = 'quoted';
    } else if (newline) {
      finish();
    } else if (char === ',') {
      row.push(value);
      value = '';
      state = 'start';
      pending = true;
    } else if (state === 'closed') {
      throw new ImportFailure('malformed_csv', `Malformed CSV near row ${line}.`);
    } else if (state === 'start' && char === '"') {
      state = 'quoted';
      pending = true;
    } else {
      value += char;
      state = 'plain';
      pending = true;
    }
    if (newline) {
      line++;
      if (ending.length === 2) i++;
      if (state !== 'quoted') startLine = line;
    }
  }
  if (state === 'quoted')
    throw new ImportFailure('malformed_csv', `Malformed CSV near row ${line}.`);
  if (pending) finish();
  return { rows, sourceRows, formulas: new Map() };
}

function cellText(cell?: CellObject): string {
  if (!cell || cell.v == null) return '';
  if (cell.t === 'd') {
    const date = cell.v instanceof Date ? cell.v : new Date(String(cell.v));
    return date
      .toISOString()
      .replace(/\.000Z$/, '')
      .replace(/Z$/, '');
  }
  if (cell.t === 'b') return cell.v ? 'True' : 'False';
  return String(cell.v);
}

function readXlsx(content: Uint8Array): Pick<Sheet, 'rows' | 'sourceRows' | 'formulas'> {
  try {
    let count = 0,
      expanded = 0;
    const entries = unzipSync(content, {
      filter(entry) {
        count++;
        expanded += entry.originalSize;
        if (count > 200 || expanded > MAX_EXPANDED_BYTES)
          throw new ImportFailure('expanded_file_too_large', 'The expanded workbook is too large.');
        return true;
      },
    });
    if (!entries['xl/workbook.xml'] || !entries['[Content_Types].xml']) throw malformedXlsx();
    let actualBytes = 0;
    let lastSourceRow = 0;
    for (const [name, bytes] of Object.entries(entries)) {
      actualBytes += bytes.length;
      if (actualBytes > MAX_EXPANDED_BYTES)
        throw new ImportFailure('expanded_file_too_large', 'The expanded workbook is too large.');
      if (!name.endsWith('.xml') && !name.endsWith('.rels')) continue;
      const xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true)
        throw malformedXlsx();
      // Validate actual cell coordinates before SheetJS reads them; ignore dimension hints.
      if (/^xl\/worksheets\/.*\.xml$/.test(name)) {
        for (const match of xml.matchAll(/<(?:\w+:)?(?:row|c)\b[^>]*\br=["']([A-Z]*)(\d+)["']/g)) {
          const row = Number(match[2]);
          lastSourceRow = Math.max(lastSourceRow, row);
          if (row > MAX_ROWS + 1) failRows();
          if (row < 1 || (match[1] && utils.decode_col(match[1]) >= COLUMNS.length))
            throw new ImportFailure('invalid_columns', 'Use only the six required columns.');
        }
      }
    }
    const workbook = read(content, {
      type: 'array',
      cellDates: true,
      cellFormula: true,
      cellText: false,
      WTF: true,
    });
    if (workbook.SheetNames.length !== 1)
      throw new ImportFailure('multiple_sheets', 'Use a workbook with exactly one worksheet.');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw malformedXlsx();
    let lastRow = lastSourceRow - 1;
    for (const key of Object.keys(sheet)) {
      if (key.startsWith('!')) continue;
      const address = utils.decode_cell(key);
      if (address.r >= MAX_ROWS + 1) failRows();
      if (address.c >= COLUMNS.length)
        throw new ImportFailure('invalid_columns', 'Use only the six required columns.');
      lastRow = Math.max(lastRow, address.r);
    }
    const rows: string[][] = [],
      sourceRows: number[] = [],
      formulas = new Map<number, number[]>();
    for (let r = 0; r <= lastRow; r++) {
      const row: string[] = [],
        formulaColumns: number[] = [];
      for (let c = 0; c < COLUMNS.length; c++) {
        const cell: CellObject | undefined = sheet[utils.encode_cell({ r, c })];
        row.push(cellText(cell));
        if (cell?.f !== undefined || cell?.F !== undefined) formulaColumns.push(c);
      }
      rows.push(row);
      sourceRows.push(r + 1);
      formulas.set(r + 1, formulaColumns);
    }
    return { rows, sourceRows, formulas };
  } catch (error) {
    if (error instanceof ImportFailure) throw error;
    if (error instanceof Error && /encrypt|password/i.test(error.message))
      throw new ImportFailure(
        'encrypted_workbook',
        'Password-protected workbooks are not supported.',
      );
    throw malformedXlsx();
  }
}

export function readSheet(content: Uint8Array, filename: string): Sheet {
  if (!/\.(csv|xlsx)$/i.test(filename))
    throw new ImportFailure('unsupported_file', 'Choose a CSV or XLSX file.');
  if (content.byteLength > MAX_BYTES)
    throw new ImportFailure('file_too_large', 'Files must be 5 MB or smaller.');
  if (!content.byteLength) throw new ImportFailure('empty_file', 'The uploaded file is empty.');
  let sheet: ReturnType<typeof readCsv>;
  if (/\.csv$/i.test(filename)) {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(content);
    } catch {
      throw new ImportFailure('invalid_encoding', 'Save the CSV as UTF-8 and try again.');
    }
    sheet = readCsv(text);
  } else sheet = readXlsx(content);
  const original = sheet.rows.shift();
  sheet.sourceRows.shift();
  if (!original) throw new ImportFailure('empty_file', 'The file does not contain a header row.');
  const headers = original.map((value) => value.trim().toLowerCase());
  const missing = COLUMNS.filter((column) => !headers.includes(column)).sort();
  const extra = headers.filter((column) => !COLUMNS.includes(column as (typeof COLUMNS)[number]));
  const duplicate = new Set(headers).size !== headers.length;
  if (missing.length || extra.length || duplicate)
    throw new ImportFailure(
      'invalid_columns',
      [
        missing.length ? `Missing columns: ${missing.join(', ')}.` : '',
        extra.length ? 'Unexpected columns. Use only the six required columns.' : '',
        duplicate ? 'Column names must be unique after trimming and lowercasing.' : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
  if (!sheet.rows.length)
    throw new ImportFailure('no_records', 'Add at least one order line below the header.');
  if (sheet.rows.length > MAX_ROWS) failRows();
  sheet.rows.forEach((row, index) => {
    if (!row.length) row.push(...COLUMNS.map(() => ''));
    if (row.length !== COLUMNS.length)
      throw new ImportFailure(
        'malformed_row',
        `Row ${sheet.sourceRows[index]} has ${row.length} cells; expected six.`,
      );
  });
  return {
    ...sheet,
    headers,
    columnChanges: original.flatMap((raw, index) =>
      raw !== headers[index] ? [`Column ${index + 1} normalized to ${headers[index]}.`] : [],
    ),
  };
}
