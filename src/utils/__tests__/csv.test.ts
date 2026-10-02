import { describe, expect, it } from 'vitest';
import { toCsv } from '../csv';

describe('toCsv', () => {
  it('escapes commas, quotes, newlines, and spreadsheet formulas', () => {
    expect(toCsv([['name', 'value'], ['A,"B"\nC', '=SUM(1,2)']])).toBe(
      '"name","value"\r\n"A,""B""\nC","\'=SUM(1,2)"\r\n',
    );
  });
});
