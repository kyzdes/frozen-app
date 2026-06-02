// Contract-conformance test (NO database needed).
//
// Single-source-of-truth lock for the sync/pair WIRE SHAPE. We define ONE
// fixture describing the canonical on-the-wire representation of Category,
// Item, HistoryEvent, and the SyncResponse envelope, then assert that:
//   - the snakeToCamel key-transform (which sync.ts + pair.ts apply to entity
//     payloads) produces exactly the camelCase entity keys clients expect;
//   - the 5 canonical HistoryEventType values match (D-006);
//   - the SyncResponse envelope keys stay snake_case;
//   - server_version is serialized as a STRING on the wire (documented, not
//     changed — backend always does String(server_version)).
//
// This is the cheap structural gate: if the wire contract drifts, this fails
// without needing a Postgres.

import { describe, expect, it } from 'vitest';
import { camelToSnake, snakeToCamel } from './utils/key-transform.js';
import type {
  Category,
  HistoryEvent,
  Item,
  SyncResponse,
} from './models/types.js';

// ---------------------------------------------------------------------------
// THE canonical wire-shape fixture (single source of truth).
//
// "db" = snake_case columns as stored / read from Postgres (what sync.ts holds
//         right before snakeToCamel).
// "wire" = camelCase entity keys as emitted to clients (after snakeToCamel),
//          since the iOS models have no CodingKeys for entity fields.
// ---------------------------------------------------------------------------
const CONTRACT = {
  category: {
    db: {
      id: 'c1',
      name: 'Meat',
      icon: 'box',
      color: '#fff',
      sort_order: 0,
      updated_at: '2026-01-01T00:00:00.000Z',
      deleted_at: null,
      item_count: 0,
    },
    wireKeys: [
      'id',
      'name',
      'icon',
      'color',
      'sortOrder',
      'updatedAt',
      'deletedAt',
      'itemCount',
    ],
  },
  item: {
    db: {
      id: 'i1',
      category_id: 'c1',
      name: 'Chicken',
      packages_count: 2,
      items_count: 5,
      shelf_number: 1,
      freeze_date: '2026-01-01T00:00:00.000Z',
      expiration_date: '2026-06-01T00:00:00.000Z',
      notes: null,
      photo_url: null,
      updated_at: '2026-01-01T00:00:00.000Z',
      deleted_at: null,
    },
    wireKeys: [
      'id',
      'categoryId',
      'name',
      'packagesCount',
      'itemsCount',
      'shelfNumber',
      'freezeDate',
      'expirationDate',
      'notes',
      'photoUrl',
      'updatedAt',
      'deletedAt',
    ],
  },
  history: {
    db: {
      id: 'h1',
      type: 'item_added',
      item_id: 'i1',
      category_id: 'c1',
      item_name: 'Chicken',
      packages_delta: 1,
      items_delta: 1,
      timestamp: '2026-01-01T00:00:00.000Z',
      deleted_at: null,
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    wireKeys: [
      'id',
      'type',
      'itemId',
      'categoryId',
      'itemName',
      'packagesDelta',
      'itemsDelta',
      'timestamp',
      'deletedAt',
      'updatedAt',
    ],
  },
  historyEventTypes: [
    'item_added',
    'item_updated',
    'item_deleted',
    'packages_changed',
    'items_changed',
  ] as const,
  syncResponseEnvelopeKeys: [
    'server_version',
    'applied_changes',
    'server_changes',
  ],
  serverChangesKeys: ['categories', 'items', 'history'],
} as const;

describe('wire-contract conformance', () => {
  describe('snakeToCamel produces the canonical entity wire keys', () => {
    it('Category', () => {
      const wire = snakeToCamel(CONTRACT.category.db);
      expect(Object.keys(wire).sort()).toEqual(
        [...CONTRACT.category.wireKeys].sort()
      );
    });

    it('Item', () => {
      const wire = snakeToCamel(CONTRACT.item.db);
      expect(Object.keys(wire).sort()).toEqual(
        [...CONTRACT.item.wireKeys].sort()
      );
    });

    it('HistoryEvent', () => {
      const wire = snakeToCamel(CONTRACT.history.db);
      expect(Object.keys(wire).sort()).toEqual(
        [...CONTRACT.history.wireKeys].sort()
      );
      // `type` passes through unchanged (it is a value, not a key to transform).
      expect((wire as any).type).toBe('item_added');
    });
  });

  describe('camelToSnake is the exact inverse for entity keys (dual-read safety)', () => {
    it('round-trips Category keys', () => {
      const wire = snakeToCamel(CONTRACT.category.db);
      const back = camelToSnake(wire as Record<string, unknown>);
      expect(Object.keys(back).sort()).toEqual(
        Object.keys(CONTRACT.category.db).sort()
      );
    });

    it('round-trips Item keys', () => {
      const wire = snakeToCamel(CONTRACT.item.db);
      const back = camelToSnake(wire as Record<string, unknown>);
      expect(Object.keys(back).sort()).toEqual(
        Object.keys(CONTRACT.item.db).sort()
      );
    });
  });

  describe('HistoryEventType canonical set (D-006)', () => {
    it('is exactly the 5 snake_case values', () => {
      expect(CONTRACT.historyEventTypes).toHaveLength(5);
      expect([...CONTRACT.historyEventTypes]).toEqual([
        'item_added',
        'item_updated',
        'item_deleted',
        'packages_changed',
        'items_changed',
      ]);
    });

    it('every value is accepted by the HistoryEvent.type union in types.ts', () => {
      // Compile-time + runtime check: assigning each fixture value to the typed
      // field must be valid. If types.ts narrows/changes the union, this file
      // fails to typecheck (npm run build) — locking the contract.
      for (const t of CONTRACT.historyEventTypes) {
        const ev: HistoryEvent = {
          id: 'h',
          type: t,
          item_name: 'x',
          timestamp: '2026-01-01T00:00:00.000Z',
        };
        expect(CONTRACT.historyEventTypes).toContain(ev.type);
      }
    });
  });

  describe('SyncResponse envelope', () => {
    it('top-level keys are snake_case', () => {
      const sample: SyncResponse = {
        server_version: '7',
        applied_changes: 0,
        server_changes: { categories: [], items: [], history: [] },
      };
      expect(Object.keys(sample).sort()).toEqual(
        [...CONTRACT.syncResponseEnvelopeKeys].sort()
      );
      expect(Object.keys(sample.server_changes).sort()).toEqual(
        [...CONTRACT.serverChangesKeys].sort()
      );
    });

    it('server_version is a STRING on the wire (documented, not changed)', () => {
      const sample: SyncResponse = {
        server_version: String(7),
        applied_changes: 0,
        server_changes: { categories: [], items: [], history: [] },
      };
      // The backend always emits String(server_version) even though the DB
      // column is BIGINT. This is intentional (BIGINT > JS-safe-int range) and
      // both web (dual-read) and iOS expect a string. Lock it.
      expect(typeof sample.server_version).toBe('string');
    });
  });

  describe('types.ts entity field surface conforms to the wire fixture', () => {
    it('Category type accepts the canonical snake_case DB shape', () => {
      const c: Category = {
        id: 'c1',
        name: 'Meat',
        icon: 'box',
        color: '#fff',
        sort_order: 0,
        updated_at: '2026-01-01T00:00:00.000Z',
      };
      expect(c.id).toBe('c1');
    });

    it('Item type accepts the canonical snake_case DB shape', () => {
      const i: Item = {
        id: 'i1',
        category_id: 'c1',
        name: 'Chicken',
        packages_count: 2,
        items_count: 5,
        shelf_number: 1,
        freeze_date: '2026-01-01',
        expiration_date: '2026-06-01',
        updated_at: '2026-01-01T00:00:00.000Z',
      };
      expect(i.id).toBe('i1');
    });
  });
});
