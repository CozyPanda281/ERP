import * as XLSX from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
}

export interface ParseResult {
  rows: ParsedRow[];
  headers: string[];
  totalRows: number;
  fileType: string;
}

export class ImportEngine {
  parse(buffer: Buffer, fileName: string, fileType?: string): ParseResult {
    const ext = fileType || fileName.split('.').pop()?.toLowerCase() || 'csv';

    switch (ext) {
      case 'csv':
      case 'txt':
        return this.parseCsv(buffer);
      case 'xlsx':
      case 'xls':
        return this.parseExcel(buffer);
      default:
        throw new Error(`Unsupported file type: .${ext}. Supported: csv, xlsx, xls, txt`);
    }
  }

  private parseCsv(buffer: Buffer): ParseResult {
    const raw = csvParse(buffer.toString('utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    const headers = Object.keys(raw[0] || {});
    const rows: ParsedRow[] = raw.map((row: any, i: number) => ({
      rowNumber: i + 2,
      data: row as Record<string, string>,
      errors: [],
    }));

    return { rows, headers, totalRows: rows.length, fileType: 'csv' };
  }

  private parseExcel(buffer: Buffer): ParseResult {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('Excel file has no sheets');

    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

    const headers = Object.keys(json[0] || {});
    const rows: ParsedRow[] = json.map((row: any, i: number) => ({
      rowNumber: i + 2,
      data: Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, v === null || v === undefined ? '' : String(v)]),
      ) as Record<string, string>,
      errors: [],
    }));

    return { rows, headers, totalRows: rows.length, fileType: 'xlsx' };
  }
}
