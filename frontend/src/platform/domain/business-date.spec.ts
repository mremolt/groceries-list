import { describe, expect, it } from 'vitest';

import { businessDate } from './index';

describe('businessDate', () => {
  it('uses the Berlin calendar day, not the UTC day, shortly after local midnight', () => {
    // 2026-07-01T22:30:00Z is 2026-07-02 00:30 in Berlin (summer time)
    expect(businessDate(Date.UTC(2026, 6, 1, 22, 30))).toBe('2026-07-02');
  });

  it('uses the Berlin calendar day in winter time', () => {
    expect(businessDate(Date.UTC(2026, 0, 15, 23, 30))).toBe('2026-01-16');
  });
});
