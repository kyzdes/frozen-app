import { describe, expect, it } from 'vitest';
import { getExpirationState, historyText } from './helpers';
import type { HistoryEvent, Item } from '../domain/models';

/**
 * Builds a UTC-midnight ISO string ('YYYY-MM-DDT00:00:00.000Z') for a date that
 * is `offsetDays` away from the current LOCAL day. This mirrors how the app
 * stores expiration dates via dateInputToISO.
 */
function isoForLocalDayOffset(offsetDays: number): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(target.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
}

function makeItem(expirationDate: string): Item {
  return {
    id: 'test-item',
    categoryId: 'cat-1',
    name: 'Test',
    packagesCount: 1,
    itemsCount: 1,
    shelfNumber: 1,
    freezeDate: isoForLocalDayOffset(-10),
    expirationDate,
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
}

describe('getExpirationState', () => {
  it('returns daysLeft === 0 and is NOT expired when expiration is today', () => {
    const result = getExpirationState(makeItem(isoForLocalDayOffset(0)));
    expect(result.daysLeft).toBe(0);
    expect(result.type).not.toBe('expired');
    expect(result.type).toBe('soon');
  });

  it('returns fresh for a clearly future expiration (> 30 days)', () => {
    const result = getExpirationState(makeItem(isoForLocalDayOffset(90)));
    expect(result.type).toBe('fresh');
    expect(result.daysLeft).toBe(90);
  });

  it('returns soon for an expiration within 30 days', () => {
    const result = getExpirationState(makeItem(isoForLocalDayOffset(5)));
    expect(result.type).toBe('soon');
    expect(result.daysLeft).toBe(5);
  });

  it('returns expired for a past expiration', () => {
    const result = getExpirationState(makeItem(isoForLocalDayOffset(-3)));
    expect(result.type).toBe('expired');
    expect(result.daysLeft).toBe(-3);
  });
});

describe('historyText', () => {
  const baseEvent: HistoryEvent = {
    id: 'evt-1',
    type: 'item_added',
    itemName: 'Курица',
    timestamp: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  it('renders item_added in Russian and English', () => {
    expect(historyText(baseEvent, 'ru')).toBe('Добавлено: Курица');
    expect(historyText(baseEvent, 'en')).toBe('Added: Курица');
  });

  it('renders packages_changed with a signed delta', () => {
    const event: HistoryEvent = { ...baseEvent, type: 'packages_changed', packagesDelta: 2 };
    expect(historyText(event, 'ru')).toBe('Курица: +2 уп.');
    expect(historyText(event, 'en')).toBe('Курица: +2 packs');
  });
});
