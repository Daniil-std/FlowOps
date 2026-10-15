import { expect, it } from 'vitest';
import { money } from '../format';

it('preserves exact cents in large server-calculated totals', () => {
  expect(money('900719925474099.91')).toBe('900,719,925,474,099.91');
  expect(money('0.00')).toBe('0.00');
  expect(money('1234.50')).toBe('1,234.50');
});
