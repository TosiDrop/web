import { describe, expect, it } from 'vitest';
import { toCsv } from '../csv';

describe('toCsv', () => {
  it('escapes commas, quotes, newlines, and spreadsheet formulas', () => {
    expect(toCsv([['name', 'value'], ['A,"B"\nC', '=SUM(1,2)']])).toBe(
      '"name","value"\r\n"A,""B""\nC","\'=SUM(1,2)"\r\n',
    );
  });

  it.each([
    '=1+1', '+SUM(A1)', '-1+1', '@SUM(A1)',
    '\t=1+1', '\r=1+1', '\n=1+1', '\tToken',
    '＝1+1', '＋SUM(A1)', '－1+1', '＠SUM(A1)', '  =1+1',
  ])('exports untrusted formula-like text as text: %j', (value) => {
    expect(toCsv([[value]])).toBe(`"'${value}"\r\n`);
  });

  it('preserves signed numeric values for calculations', () => {
    expect(toCsv([[-2.5, 0, 125]])).toBe('"-2.5","0","125"\r\n');
  });
});
