const escapeCell = (value) => {
  let text = value == null ? '' : String(value);
  // Prevent spreadsheet programs from evaluating untrusted names as formulas.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export const serializeCsv = (rows) => rows.map(row => row.map(escapeCell).join(',')).join('\r\n');
