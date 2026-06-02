import { describe, expect, it } from 'vitest';
import {
  MAX_HISTORY,
  applyServerChanges,
  applyServerChangesWithMeta,
  compactPendingChanges,
} from './sync-engine';
import type {
  AppState,
  Category,
  HistoryEvent,
  Item,
  PendingChange,
  PendingChangeType,
} from '../domain/models';
import { syncDataToDTO } from '../domain/mappers';

// ---- fixtures -------------------------------------------------------------

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    name: 'Овощи',
    icon: '🥬',
    color: '#34C759',
    itemCount: 0,
    sortOrder: 0,
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    categoryId: 'cat-1',
    name: 'Курица',
    packagesCount: 1,
    itemsCount: 1,
    shelfNumber: 1,
    freezeDate: '2026-01-01T00:00:00.000Z',
    expirationDate: '2026-06-01T00:00:00.000Z',
    notes: '',
    photoUrl: '',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function makeHistory(overrides: Partial<HistoryEvent> = {}): HistoryEvent {
  return {
    id: 'evt-1',
    type: 'item_added',
    itemId: 'item-1',
    categoryId: 'cat-1',
    itemName: 'Курица',
    timestamp: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function pending(
  type: PendingChangeType,
  entityId: string,
  payload: Partial<Pick<PendingChange, 'category' | 'item' | 'historyEvent'>>,
  timestamp = '2026-01-01T00:00:00.000Z'
): PendingChange {
  return { id: `pc-${type}-${entityId}-${timestamp}`, type, entityId, timestamp, ...payload };
}

// Minimal in-memory AppState fixture. We avoid storage.createInitialState()
// because it touches localStorage, which is absent in the node test env.
function stateWith(partial: Partial<Pick<AppState, 'categories' | 'items' | 'history'>>): AppState {
  return {
    schemaVersion: 3,
    deviceId: 'test-device',
    auth: { isAuthenticated: false },
    categories: [],
    items: [],
    history: [],
    screen: 'home',
    settings: {
      appLanguage: 'ru',
      appearanceMode: 'system',
      notificationsEnabled: false,
      notificationDays: [3, 7, 14],
      flags: { web_sync_engine: true, web_settings_v2: true, web_notifications: true },
    },
    sync: {
      pair: null,
      lastKnownVersion: 0,
      pendingChanges: [],
      status: { state: 'idle', pendingChangesCount: 0 },
    },
    ...partial,
  };
}

// ---- compactPendingChanges ------------------------------------------------

describe('compactPendingChanges', () => {
  it('dedupes by entity id — the last edit for an id wins', () => {
    const first = makeItem({ name: 'Курица', updatedAt: '2026-01-01T00:00:00.000Z' });
    const second = makeItem({ name: 'Курица обновлённая', updatedAt: '2026-01-02T00:00:00.000Z' });

    const result = compactPendingChanges([
      pending('itemAdded', 'item-1', { item: first }),
      pending('itemUpdated', 'item-1', { item: second }),
    ]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Курица обновлённая');
  });

  it('keeps distinct entities separate and sorts by updatedAt ascending', () => {
    const older = makeItem({ id: 'item-1', updatedAt: '2026-01-01T00:00:00.000Z' });
    const newer = makeItem({ id: 'item-2', updatedAt: '2026-02-01T00:00:00.000Z' });

    const result = compactPendingChanges([
      pending('itemAdded', 'item-2', { item: newer }),
      pending('itemAdded', 'item-1', { item: older }),
    ]);

    expect(result.items.map((i) => i.id)).toEqual(['item-1', 'item-2']);
  });

  it('routes categories, items and history into their own DTO buckets', () => {
    const result = compactPendingChanges([
      pending('categoryAdded', 'cat-1', { category: makeCategory() }),
      pending('itemAdded', 'item-1', { item: makeItem() }),
      pending('historyAdded', 'evt-1', { historyEvent: makeHistory() }),
    ]);

    expect(result.categories).toHaveLength(1);
    expect(result.items).toHaveLength(1);
    expect(result.history).toHaveLength(1);
  });

  it('carries a soft-deleted entity through as a DTO with deleted_at set', () => {
    const deleted = makeItem({ deletedAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' });
    const result = compactPendingChanges([pending('itemDeleted', 'item-1', { item: deleted })]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].deleted_at).toBe('2026-03-01T00:00:00.000Z');
  });

  it('ignores changes whose payload entity is missing', () => {
    const result = compactPendingChanges([pending('itemUpdated', 'item-1', {})]);
    expect(result.items).toHaveLength(0);
  });
});

// ---- applyServerChanges: LWW merge ---------------------------------------

describe('applyServerChanges — last-write-wins merge', () => {
  it('newer server updatedAt overwrites the local copy', () => {
    const local = makeItem({ name: 'local', updatedAt: '2026-01-01T00:00:00.000Z' });
    const server = makeItem({ name: 'server', updatedAt: '2026-02-01T00:00:00.000Z' });

    const next = applyServerChanges(stateWith({ items: [local] }), syncDataToDTO({ categories: [], items: [server], history: [] }));

    expect(next.items).toHaveLength(1);
    expect(next.items[0].name).toBe('server');
  });

  it('older server updatedAt is ignored in favour of the local copy', () => {
    const local = makeItem({ name: 'local', updatedAt: '2026-02-01T00:00:00.000Z' });
    const server = makeItem({ name: 'server', updatedAt: '2026-01-01T00:00:00.000Z' });

    const next = applyServerChanges(stateWith({ items: [local] }), syncDataToDTO({ categories: [], items: [server], history: [] }));

    expect(next.items).toHaveLength(1);
    expect(next.items[0].name).toBe('local');
  });

  it('equal updatedAt lets the incoming server copy win (>= comparison)', () => {
    const ts = '2026-01-01T00:00:00.000Z';
    const local = makeItem({ name: 'local', updatedAt: ts });
    const server = makeItem({ name: 'server', updatedAt: ts });

    const next = applyServerChanges(stateWith({ items: [local] }), syncDataToDTO({ categories: [], items: [server], history: [] }));

    expect(next.items[0].name).toBe('server');
  });

  it('applies LWW to categories too and refreshes itemCount', () => {
    const localCat = makeCategory({ name: 'local', updatedAt: '2026-01-01T00:00:00.000Z' });
    const serverCat = makeCategory({ name: 'server', updatedAt: '2026-02-01T00:00:00.000Z' });
    const item = makeItem();

    const next = applyServerChanges(
      stateWith({ categories: [localCat], items: [item] }),
      syncDataToDTO({ categories: [serverCat], items: [], history: [] })
    );

    expect(next.categories).toHaveLength(1);
    expect(next.categories[0].name).toBe('server');
    expect(next.categories[0].itemCount).toBe(1);
  });
});

// ---- applyServerChanges: soft-delete handling -----------------------------

describe('applyServerChanges — soft-delete handling', () => {
  it('drops an item the server soft-deleted with a newer updatedAt', () => {
    const local = makeItem({ updatedAt: '2026-01-01T00:00:00.000Z' });
    const tombstone = makeItem({ deletedAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z' });

    const next = applyServerChanges(stateWith({ items: [local] }), syncDataToDTO({ categories: [], items: [tombstone], history: [] }));

    expect(next.items).toHaveLength(0);
  });

  it('keeps a local item when the server tombstone is older (LWW protects local edit)', () => {
    const local = makeItem({ name: 'kept', updatedAt: '2026-03-01T00:00:00.000Z' });
    const staleTombstone = makeItem({ deletedAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' });

    const next = applyServerChanges(stateWith({ items: [local] }), syncDataToDTO({ categories: [], items: [staleTombstone], history: [] }));

    expect(next.items).toHaveLength(1);
    expect(next.items[0].name).toBe('kept');
  });

  it('excludes soft-deleted history events from the merged result', () => {
    const live = makeHistory({ id: 'evt-1' });
    const deleted = makeHistory({ id: 'evt-2', deletedAt: '2026-02-01T00:00:00.000Z' });

    const next = applyServerChanges(stateWith({}), syncDataToDTO({ categories: [], items: [], history: [live, deleted] }));

    expect(next.history.map((e) => e.id)).toEqual(['evt-1']);
  });
});

// ---- history cap ----------------------------------------------------------

describe('applyServerChanges — history cap', () => {
  it('exposes MAX_HISTORY as a named constant set to 1000', () => {
    expect(MAX_HISTORY).toBe(1000);
  });

  function manyEvents(count: number): HistoryEvent[] {
    return Array.from({ length: count }, (_, i) =>
      makeHistory({
        id: `evt-${i}`,
        // distinct, monotonically increasing timestamps so ordering is stable
        timestamp: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString(),
        updatedAt: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString(),
      })
    );
  }

  it('truncates merged history to MAX_HISTORY entries', () => {
    const events = manyEvents(MAX_HISTORY + 250);
    const next = applyServerChanges(stateWith({}), syncDataToDTO({ categories: [], items: [], history: events }));

    expect(next.history).toHaveLength(MAX_HISTORY);
  });

  it('keeps the newest events (sorted by timestamp desc) after truncation', () => {
    const events = manyEvents(MAX_HISTORY + 5);
    const next = applyServerChanges(stateWith({}), syncDataToDTO({ categories: [], items: [], history: events }));

    // newest event id is the highest index
    expect(next.history[0].id).toBe(`evt-${MAX_HISTORY + 4}`);
  });

  it('does not truncate when under the cap', () => {
    const events = manyEvents(10);
    const { state, historyTruncated } = applyServerChangesWithMeta(
      stateWith({}),
      syncDataToDTO({ categories: [], items: [], history: events })
    );

    expect(state.history).toHaveLength(10);
    expect(historyTruncated).toBe(false);
  });

  it('reports historyTruncated = true when the cap is exceeded', () => {
    const events = manyEvents(MAX_HISTORY + 1);
    const { historyTruncated } = applyServerChangesWithMeta(
      stateWith({}),
      syncDataToDTO({ categories: [], items: [], history: events })
    );

    expect(historyTruncated).toBe(true);
  });
});
