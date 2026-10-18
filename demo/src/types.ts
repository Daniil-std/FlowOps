export type Currency = 'USD' | 'EUR' | 'GBP' | 'PLN';
export interface ImportSummary {
  id: string;
  filename: string;
  currency: Currency | null;
  processing_version: number;
  file_size: number;
  created_at: string;
  status: 'ready' | 'needs_review' | 'no_valid_rows';
  total_rows: number;
  valid_rows: number;
  duplicate_rows: number;
  invalid_rows: number;
  issue_count: number;
  normalized_rows: number;
}

export interface OrderLine {
  source_row: number;
  order_id: string;
  date: string;
  customer: string;
  product: string;
  quantity: number;
  unit_price: string;
}

export interface Issue {
  row: number;
  column: string;
  code: string;
  message: string;
}

export interface ImportDetail extends ImportSummary {
  records: OrderLine[];
  issues: Issue[];
  changes: Issue[];
  column_changes: string[];
}

export interface ImportPage {
  items: ImportSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface Analytics {
  revenue: string;
  orders: number;
  average_order_value: string;
  units: number;
  revenue_over_time: { date: string; revenue: string }[];
  top_products: { product: string; quantity: number; revenue: string }[];
}

export interface ReportResult {
  job: ImportDetail;
  analytics: Analytics;
}
