import type { Analytics, Currency, ImportDetail, Issue, OrderLine, ReportResult } from '../types';
import { COLUMNS, ImportFailure, readSheet } from './reading';

export function parseDate(value: string): string {
  const normalized = value.replaceAll('/', '-').replace(/T00:00:00$/, '');
  if (
    (/^\d{4}([-/])\d{2}\1\d{2}$/.test(value) || /^\d{4}-\d{2}-\d{2}T00:00:00$/.test(value)) &&
    !normalized.startsWith('0000')
  ) {
    const date = new Date(`${normalized}T00:00:00Z`);
    if (!Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === normalized)
      return normalized;
  }
  throw new Error('Use YYYY-MM-DD, YYYY/MM/DD, or an Excel date without a time.');
}

export function parseNumber(value: string, column: 'quantity' | 'unit_price'): string {
  const normalized = /^[+-]?\d{1,3}(,\d{3})+\.\d{1,2}$/.test(value)
    ? value.replaceAll(',', '')
    : value;
  if (!/^[+-]?\d+(\.\d+)?$/.test(normalized))
    throw new Error('Use a plain number with a decimal point; ambiguous separators are rejected.');
  const [whole, fraction = ''] = normalized.replace(/^[+-]/, '').split('.');
  const significantFraction = fraction.replace(/0+$/, '');
  const integer = BigInt(whole);
  if (integer > 1_000_000n || (integer === 1_000_000n && significantFraction))
    throw new Error('The maximum supported value is 1,000,000.');
  const negative = normalized.startsWith('-') && (integer !== 0n || !!significantFraction);
  if (column === 'quantity') {
    if (negative || integer === 0n || significantFraction)
      throw new Error('Quantity must be a positive whole number.');
    return integer.toString();
  }
  if (negative || significantFraction.length > 2)
    throw new Error('Unit price must be non-negative with at most two decimal places.');
  return `${integer}.${fraction.slice(0, 2).padEnd(2, '0')}`;
}

export const amount = (cents: bigint) =>
  `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
const cents = (price: string) => BigInt(price.replace('.', ''));
const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function calculateAnalytics(records: OrderLine[]): Analytics {
  let revenue = 0n,
    units = 0;
  const orders = new Set<string>(),
    daily = new Map<string, bigint>();
  const products = new Map<string, { quantity: number; revenue: bigint }>();
  for (const record of records) {
    const lineRevenue = cents(record.unit_price) * BigInt(record.quantity);
    revenue += lineRevenue;
    units += record.quantity;
    orders.add(record.order_id);
    daily.set(record.date, (daily.get(record.date) ?? 0n) + lineRevenue);
    const product = products.get(record.product) ?? { quantity: 0, revenue: 0n };
    products.set(record.product, {
      quantity: product.quantity + record.quantity,
      revenue: product.revenue + lineRevenue,
    });
  }
  const count = BigInt(orders.size);
  return {
    revenue: amount(revenue),
    orders: orders.size,
    units,
    average_order_value: amount(count ? (revenue * 2n + count) / (2n * count) : 0n),
    revenue_over_time: [...daily]
      .sort(([a], [b]) => compareText(a, b))
      .map(([date, value]) => ({ date, revenue: amount(value) })),
    top_products: [...products]
      .sort(
        ([a, av], [b, bv]) =>
          bv.quantity - av.quantity ||
          (bv.revenue > av.revenue ? 1 : bv.revenue < av.revenue ? -1 : compareText(a, b)),
      )
      .slice(0, 5)
      .map(([product, value]) => ({
        product,
        quantity: value.quantity,
        revenue: amount(value.revenue),
      })),
  };
}

export function processFile(
  content: Uint8Array,
  filename: string,
  currency: Currency,
  progress: (value: number) => void = () => {},
): ReportResult {
  if (!['USD', 'EUR', 'GBP', 'PLN'].includes(currency))
    throw new ImportFailure('invalid_currency', 'Choose USD, EUR, GBP, or PLN for this file.');
  progress(10);
  const sheet = readSheet(content, filename);
  progress(35);
  const job: ImportDetail = {
    id: crypto.randomUUID(),
    filename: filename.replaceAll('\\', '/').split('/').pop()!.slice(0, 200),
    currency,
    processing_version: 2,
    file_size: content.byteLength,
    created_at: new Date().toISOString(),
    status: 'ready',
    total_rows: sheet.rows.length,
    valid_rows: 0,
    invalid_rows: 0,
    duplicate_rows: 0,
    issue_count: 0,
    normalized_rows: 0,
    records: [],
    issues: [],
    changes: [],
    column_changes: sheet.columnChanges,
  };
  const candidates: { record: OrderLine; raw: string[]; changes: Issue[] }[] = [];
  const identities = new Map<string, Set<string>>(),
    identityRows = new Map<number, string>();
  sheet.rows.forEach((values, index) => {
    const row = sheet.sourceRows[index],
      raw = COLUMNS.map((column) => values[sheet.headers.indexOf(column)]);
    const cleaned = raw.map((value) => value.trim());
    const issues: Issue[] = [],
      changes: Issue[] = [];
    COLUMNS.forEach((column, c) => {
      const value = cleaned[c];
      const error = sheet.formulas.get(row)?.includes(sheet.headers.indexOf(column))
        ? 'Excel formulas are not supported. Replace the formula with a literal value.'
        : !value
          ? 'A required value is missing.'
          : // eslint-disable-next-line no-control-regex
            /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)
            ? 'Control characters are not supported.'
            : [...value].length > 200
              ? 'Values must contain at most 200 characters.'
              : undefined;
      if (error) {
        issues.push({ row, column, code: 'invalid_value', message: error });
        return;
      }
      if (raw[c] !== value)
        changes.push({
          row,
          column,
          code: 'whitespace',
          message: 'Trimmed surrounding whitespace.',
        });
      try {
        if (column === 'date') cleaned[c] = parseDate(value);
        if (column === 'quantity' || column === 'unit_price')
          cleaned[c] = parseNumber(value, column);
        if (cleaned[c] !== value)
          changes.push({
            row,
            column,
            code: 'format',
            message: `Normalized ${value} to ${cleaned[c]}.`,
          });
      } catch (error) {
        issues.push({ row, column, code: `invalid_${column}`, message: (error as Error).message });
      }
    });
    const [order_id, date, customer, product, quantity, unit_price] = cleaned;
    if (!issues.some((issue) => ['order_id', 'date', 'customer'].includes(issue.column))) {
      const identity = identities.get(order_id) ?? new Set<string>();
      identity.add(JSON.stringify([date, customer]));
      identities.set(order_id, identity);
      identityRows.set(row, order_id);
    }
    if (issues.length) {
      job.invalid_rows++;
      job.issues.push(...issues);
    } else
      candidates.push({
        record: {
          source_row: row,
          order_id,
          date,
          customer,
          product,
          quantity: Number(quantity),
          unit_price,
        },
        raw,
        changes,
      });
    if (index % 250 === 0) progress(35 + Math.floor((index / sheet.rows.length) * 45));
  });
  const conflicts = new Set(
    [...identities].filter(([, values]) => values.size > 1).map(([id]) => id),
  );
  for (const [row, id] of identityRows)
    if (conflicts.has(id))
      job.issues.push({
        row,
        column: 'order_id',
        code: 'order_conflict',
        message:
          'This order ID has different dates or customers. All its rows are excluded; correct the order identity and import again.',
      });
  const seen = new Map<string, { row: number; raw: string[] }>();
  for (const { record, raw, changes } of candidates) {
    if (conflicts.has(record.order_id)) {
      job.invalid_rows++;
      continue;
    }
    const key = JSON.stringify(COLUMNS.map((column) => record[column])),
      first = seen.get(key);
    if (first) {
      job.duplicate_rows++;
      job.issues.push({
        row: record.source_row,
        column: 'row',
        code: raw.every((value, index) => value === first.raw[index])
          ? 'duplicate'
          : 'normalized_duplicate',
        message: `Matches row ${first.row} after normalization; excluded as a potential duplicate. If both are real identical items, combine their quantities in the source file and import again.`,
      });
      continue;
    }
    seen.set(key, { row: record.source_row, raw });
    job.records.push(record);
    job.changes.push(...changes);
  }
  job.issues.sort(
    (a, b) => a.row - b.row || compareText(a.column, b.column) || compareText(a.code, b.code),
  );
  job.valid_rows = job.records.length;
  job.issue_count = job.issues.length;
  job.normalized_rows = new Set(job.changes.map((change) => change.row)).size;
  job.status = !job.valid_rows ? 'no_valid_rows' : job.issue_count ? 'needs_review' : 'ready';
  progress(90);
  const analytics = calculateAnalytics(job.records);
  progress(100);
  return { job, analytics };
}
