import type { ImportDetail } from '../types';

export const job: ImportDetail = {
  id: '3a9522b3-651b-46a5-a92e-736afba90460',
  filename: 'september.csv',
  currency: 'USD',
  processing_version: 2,
  file_size: 138,
  created_at: '2026-09-25T10:00:00Z',
  status: 'needs_review',
  total_rows: 3,
  valid_rows: 1,
  duplicate_rows: 1,
  invalid_rows: 1,
  issue_count: 2,
  normalized_rows: 1,
  records: [
    {
      source_row: 2,
      order_id: 'FO-1001',
      date: '2026-09-01',
      customer: 'Mira Ellis',
      product: 'Notebook',
      quantity: 2,
      unit_price: '18.50',
    },
  ],
  issues: [
    {
      row: 3,
      column: 'row',
      code: 'duplicate',
      message: 'Exact duplicate of row 2; excluded from cleaned data.',
    },
    {
      row: 4,
      column: 'date',
      code: 'invalid_date',
      message: 'Use YYYY-MM-DD, YYYY/MM/DD, or an Excel date without a time.',
    },
  ],
  changes: [
    { row: 2, column: 'customer', code: 'whitespace', message: 'Trimmed surrounding whitespace.' },
  ],
  column_changes: [],
};
