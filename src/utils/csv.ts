function cell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? '' : String(value);
  // Prevent spreadsheet software from treating an untrusted token name as a formula.
  const safe = /^[=+@-]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>): void {
  const blob = new Blob(['\uFEFF', toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
