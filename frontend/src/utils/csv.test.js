import { describe, expect, it } from 'vitest';
import { serializeCsv } from './csv';

describe('CSV export', () => {
  it('quotes commas, double quotes, and newlines in employee names', () => {
    expect(serializeCsv([['Name', 'Status'], ['Doe, "Jane"\nJr.', 'IN']]))
      .toBe('"Name","Status"\r\n"Doe, ""Jane""\nJr.","IN"');
  });

  it('keeps spreadsheet formulas as text', () => {
    expect(serializeCsv([['=IMPORTXML("url")']]))
      .toBe('"\'=IMPORTXML(""url"")"');
  });
});
