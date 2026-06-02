import { describe, expect, it } from 'vitest';
import { categoryFromDTO, historyFromDTO, itemFromDTO } from './mappers';
import type { CategoryDTO, HistoryEventDTO, ItemDTO } from './contracts';

/**
 * KI-005 lock: the backend applies snakeToCamel to entity payloads in /sync and
 * /pair responses, while the persisted/web DTOs are snake_case. The *FromDTO
 * mappers therefore dual-read (snake ?? camel). These tests feed each mapper
 * BOTH shapes and assert the mapped domain object is byte-identical and fully
 * populated (no undefined fields that should have a value).
 */

// We intentionally type the camelCase payloads loosely: at runtime the backend
// sends camelCase keys that the DTO types don't formally declare. The mappers
// read them via an internal cast, so we mirror that here with `as` casts.

describe('categoryFromDTO dual-read (snake vs camel)', () => {
  const snake: CategoryDTO = {
    id: 'cat-1',
    name: 'Овощи',
    icon: '🥬',
    color: '#34C759',
    sort_order: 2,
    updated_at: '2026-01-02T03:04:05.000Z',
    deleted_at: '2026-01-03T00:00:00.000Z',
  };

  const camel = {
    id: 'cat-1',
    name: 'Овощи',
    icon: '🥬',
    color: '#34C759',
    sortOrder: 2,
    updatedAt: '2026-01-02T03:04:05.000Z',
    deletedAt: '2026-01-03T00:00:00.000Z',
  } as unknown as CategoryDTO;

  it('maps snake_case and camelCase to identical domain objects', () => {
    const fromSnake = categoryFromDTO(snake);
    const fromCamel = categoryFromDTO(camel);
    expect(fromSnake).toEqual(fromCamel);
  });

  it('fully populates every field (no undefined where a value exists)', () => {
    const result = categoryFromDTO(snake);
    expect(result).toEqual({
      id: 'cat-1',
      name: 'Овощи',
      icon: '🥬',
      color: '#34C759',
      itemCount: 0,
      sortOrder: 2,
      updatedAt: '2026-01-02T03:04:05.000Z',
      deletedAt: '2026-01-03T00:00:00.000Z',
    });
    expect(result.sortOrder).not.toBeUndefined();
    expect(result.updatedAt).not.toBeUndefined();
  });

  it('reads sortOrder from camelCase payload', () => {
    expect(categoryFromDTO(camel).sortOrder).toBe(2);
  });
});

describe('itemFromDTO dual-read (snake vs camel)', () => {
  const snake: ItemDTO = {
    id: 'item-1',
    category_id: 'cat-1',
    name: 'Курица',
    packages_count: 3,
    items_count: 12,
    shelf_number: 2,
    freeze_date: '2026-01-01T00:00:00.000Z',
    expiration_date: '2026-06-01T00:00:00.000Z',
    notes: 'нижняя полка',
    photo_url: 'https://example.test/p.jpg',
    updated_at: '2026-01-02T03:04:05.000Z',
    deleted_at: null,
  };

  const camel = {
    id: 'item-1',
    categoryId: 'cat-1',
    name: 'Курица',
    packagesCount: 3,
    itemsCount: 12,
    shelfNumber: 2,
    freezeDate: '2026-01-01T00:00:00.000Z',
    expirationDate: '2026-06-01T00:00:00.000Z',
    notes: 'нижняя полка',
    photoUrl: 'https://example.test/p.jpg',
    updatedAt: '2026-01-02T03:04:05.000Z',
    deletedAt: null,
  } as unknown as ItemDTO;

  it('maps snake_case and camelCase to identical domain objects', () => {
    const fromSnake = itemFromDTO(snake);
    const fromCamel = itemFromDTO(camel);
    expect(fromSnake).toEqual(fromCamel);
  });

  it('fully populates every field with the correct values', () => {
    const result = itemFromDTO(snake);
    expect(result).toEqual({
      id: 'item-1',
      categoryId: 'cat-1',
      name: 'Курица',
      packagesCount: 3,
      itemsCount: 12,
      shelfNumber: 2,
      freezeDate: '2026-01-01T00:00:00.000Z',
      expirationDate: '2026-06-01T00:00:00.000Z',
      notes: 'нижняя полка',
      photoUrl: 'https://example.test/p.jpg',
      updatedAt: '2026-01-02T03:04:05.000Z',
      deletedAt: null,
    });
  });

  it('reads camelCase numeric/string fields without falling back to defaults', () => {
    const result = itemFromDTO(camel);
    expect(result.categoryId).toBe('cat-1');
    expect(result.packagesCount).toBe(3);
    expect(result.itemsCount).toBe(12);
    expect(result.shelfNumber).toBe(2);
    expect(result.photoUrl).toBe('https://example.test/p.jpg');
  });
});

describe('historyFromDTO dual-read (snake vs camel)', () => {
  const snake: HistoryEventDTO = {
    id: 'evt-1',
    type: 'packages_changed',
    item_id: 'item-1',
    category_id: 'cat-1',
    item_name: 'Курица',
    packages_delta: 2,
    items_delta: -1,
    timestamp: '2026-01-02T03:04:05.000Z',
    updated_at: '2026-01-02T03:04:05.000Z',
    deleted_at: null,
  };

  const camel = {
    id: 'evt-1',
    type: 'packages_changed',
    itemId: 'item-1',
    categoryId: 'cat-1',
    itemName: 'Курица',
    packagesDelta: 2,
    itemsDelta: -1,
    timestamp: '2026-01-02T03:04:05.000Z',
    updatedAt: '2026-01-02T03:04:05.000Z',
    deletedAt: null,
  } as unknown as HistoryEventDTO;

  it('maps snake_case and camelCase to identical domain objects', () => {
    const fromSnake = historyFromDTO(snake);
    const fromCamel = historyFromDTO(camel);
    expect(fromSnake).toEqual(fromCamel);
  });

  it('fully populates every field with the correct values', () => {
    const result = historyFromDTO(snake);
    expect(result).toEqual({
      id: 'evt-1',
      type: 'packages_changed',
      itemId: 'item-1',
      categoryId: 'cat-1',
      itemName: 'Курица',
      packagesDelta: 2,
      itemsDelta: -1,
      timestamp: '2026-01-02T03:04:05.000Z',
      updatedAt: '2026-01-02T03:04:05.000Z',
      deletedAt: null,
    });
  });

  it('reads camelCase fields and keeps the canonical snake_case event type', () => {
    const result = historyFromDTO(camel);
    expect(result.itemId).toBe('item-1');
    expect(result.categoryId).toBe('cat-1');
    expect(result.itemName).toBe('Курица');
    expect(result.packagesDelta).toBe(2);
    expect(result.itemsDelta).toBe(-1);
    // D-006: HistoryEvent.type stays one of the 5 snake_case canonical values.
    expect(result.type).toBe('packages_changed');
  });

  it('falls back updatedAt to timestamp when neither updated_at nor updatedAt is present', () => {
    const minimal = {
      id: 'evt-2',
      type: 'item_added',
      item_name: 'Рыба',
      timestamp: '2026-02-02T00:00:00.000Z',
    } as HistoryEventDTO;
    const result = historyFromDTO(minimal);
    expect(result.updatedAt).toBe('2026-02-02T00:00:00.000Z');
  });
});
