import * as XLSX from 'xlsx';

export type ExcelCellValue = string | number | boolean | Date | null | undefined;

export interface ExcelColumn<T> {
  header: string;
  key?: keyof T | string;
  value?: (row: T, index: number) => ExcelCellValue;
  width?: number;
}

export interface ExportToExcelOptions<T> {
  fileName: string;
  sheetName: string;
  columns: ExcelColumn<T>[];
  rows: T[];
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function getTimestamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join('-') + `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function normalizeFileName(fileName: string) {
  const baseName = fileName.replace(/\.xlsx$/i, '').trim() || 'bao-cao';
  return `${baseName}-${getTimestamp()}.xlsx`;
}

function normalizeSheetName(sheetName: string) {
  return (sheetName || 'Sheet 1').replace(/[\\/*?:[\]]/g, ' ').slice(0, 31);
}

function getValue<T>(row: T, column: ExcelColumn<T>, index: number): ExcelCellValue {
  if (column.value) return column.value(row, index);
  if (!column.key) return '';
  return (row as Record<string, ExcelCellValue>)[String(column.key)] ?? '';
}

function toCellValue(value: ExcelCellValue) {
  if (value === undefined || value === null) return '';
  return value;
}

function getDisplayLength(value: ExcelCellValue) {
  if (value === undefined || value === null) return 0;
  if (value instanceof Date) return 10;
  return String(value).length;
}

export function exportToExcel<T>({ fileName, sheetName, columns, rows }: ExportToExcelOptions<T>) {
  if (!rows.length || !columns.length) return false;

  const headers = columns.map((column) => column.header);
  const exportRows = rows.map((row, rowIndex) =>
    columns.reduce<Record<string, ExcelCellValue>>((record, column) => {
      record[column.header] = toCellValue(getValue(row, column, rowIndex));
      return record;
    }, {})
  );

  const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: headers });
  worksheet['!cols'] = columns.map((column) => {
    const maxLength = rows.reduce((max, row, rowIndex) => Math.max(max, getDisplayLength(getValue(row, column, rowIndex))), column.header.length);
    return { wch: Math.min(Math.max(column.width ?? maxLength + 2, 12), 48) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, normalizeSheetName(sheetName));
  XLSX.writeFile(workbook, normalizeFileName(fileName), { compression: true });

  return true;
}
