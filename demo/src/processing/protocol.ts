import type { Currency, ImportDetail, ReportResult } from '../types';
import type { ExportFormat } from './exports';

export type WorkerRequest =
  | { kind: 'import'; file: File; currency: Currency }
  | { kind: 'export'; job: ImportDetail; format: ExportFormat };
export type WorkerResponse =
  | { kind: 'progress'; value: number }
  | { kind: 'report'; result: ReportResult }
  | { kind: 'download'; blob: Blob }
  | { kind: 'error'; message: string };
