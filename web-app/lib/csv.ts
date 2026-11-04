/**
 * Downloads rows as a CSV file Excel opens correctly in Portuguese locales: ";" separators and a
 * BOM so accents survive; numbers with a decimal comma.
 */
export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]): void {
  const cell = (value: string | number) => {
    const text = typeof value === 'number' ? String(value).replace('.', ',') : value;
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [header, ...rows].map((row) => row.map(cell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
