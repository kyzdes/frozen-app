import { describe, it, expect } from 'vitest';
import { resolveConflict } from './conflict-resolver';

// Helper to build a minimal record. `updated_at`/`deleted_at` accept ISO strings.
function rec(updated_at: string, deleted_at?: string | null) {
  return { updated_at, deleted_at };
}

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-01T00:00:01.000Z'; // 1s later
const T2 = '2026-01-01T00:00:02.000Z'; // 2s later

describe('resolveConflict', () => {
  describe('null server record', () => {
    it('client wins when the record does not exist on the server', () => {
      const client = rec(T0);
      const result = resolveConflict(client, null);
      expect(result.winner).toBe('client');
      expect(result.data).toBe(client);
    });

    it('client wins even when the client record is a delete and server is null', () => {
      const client = rec(T0, T0);
      const result = resolveConflict(client, null);
      expect(result.winner).toBe('client');
      expect(result.data).toBe(client);
    });
  });

  describe('both updated (no deletion)', () => {
    it('client wins on newer updated_at', () => {
      const client = rec(T2);
      const server = rec(T1);
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('client');
      expect(result.data).toBe(client);
    });

    it('server wins on newer updated_at', () => {
      const client = rec(T1);
      const server = rec(T2);
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('server');
      expect(result.data).toBe(server);
    });

    it('server wins on a tie (equal updated_at)', () => {
      const client = rec(T1);
      const server = rec(T1);
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('server');
      expect(result.data).toBe(server);
    });

    it('treats explicit null deleted_at as not-deleted', () => {
      const client = rec(T2, null);
      const server = rec(T1, null);
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('client');
    });

    it('treats undefined deleted_at as not-deleted', () => {
      const client = rec(T2, undefined);
      const server = rec(T1, undefined);
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('client');
    });
  });

  describe('both deleted', () => {
    it('latest deletedAt wins (client newer)', () => {
      const client = rec(T0, T2);
      const server = rec(T0, T1);
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('client');
      expect(result.data).toBe(client);
    });

    it('latest deletedAt wins (server newer)', () => {
      const client = rec(T0, T1);
      const server = rec(T0, T2);
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('server');
      expect(result.data).toBe(server);
    });

    it('server wins on a tie in deletedAt', () => {
      const client = rec(T0, T1);
      const server = rec(T0, T1);
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('server');
      expect(result.data).toBe(server);
    });

    it('compares deletedAt and ignores updated_at when both are deleted', () => {
      // Client has a much newer updated_at but an older deletedAt -> server still wins.
      const client = rec(T2, T0);
      const server = rec(T0, T1);
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('server');
    });
  });

  describe('client deleted, server updated (delete-vs-update)', () => {
    it('client delete wins when delete is newer than server update', () => {
      const client = rec(T0, T2); // deleted at T2
      const server = rec(T1); // updated at T1
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('client');
      expect(result.data).toBe(client);
    });

    it('server update wins when update is newer than client delete', () => {
      const client = rec(T0, T1); // deleted at T1
      const server = rec(T2); // updated at T2
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('server');
      expect(result.data).toBe(server);
    });

    it('server wins on a tie between client deletedAt and server updated_at', () => {
      const client = rec(T0, T1); // deleted at T1
      const server = rec(T1); // updated at T1
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('server');
      expect(result.data).toBe(server);
    });
  });

  describe('server deleted, client updated (delete-vs-update)', () => {
    it('server delete wins when delete is newer than client update', () => {
      const client = rec(T1); // updated at T1
      const server = rec(T0, T2); // deleted at T2
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('server');
      expect(result.data).toBe(server);
    });

    it('client update wins when update is newer than server delete', () => {
      const client = rec(T2); // updated at T2
      const server = rec(T0, T1); // deleted at T1
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('client');
      expect(result.data).toBe(client);
    });

    it('client wins on a tie between server deletedAt and client updated_at', () => {
      // Server deletedAt strictly greater wins for server; on a tie the strict `>`
      // is false, so the client update wins.
      const client = rec(T1); // updated at T1
      const server = rec(T0, T1); // deleted at T1
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('client');
      expect(result.data).toBe(client);
    });
  });

  describe('returned data integrity', () => {
    it('returns the exact winning record object (no mutation/copy)', () => {
      const client = rec(T2);
      const server = rec(T1);
      const result = resolveConflict(client, server);
      // The function returns the original object reference for the winner.
      expect(result.data).toBe(client);
      expect(result.data.updated_at).toBe(T2);
    });

    it('works with records carrying extra fields (generic T preserved)', () => {
      const client = { updated_at: T2, deleted_at: undefined, name: 'client' };
      const server = { updated_at: T1, deleted_at: undefined, name: 'server' };
      const result = resolveConflict(client, server);
      expect(result.winner).toBe('client');
      expect((result.data as typeof client).name).toBe('client');
    });
  });
});

// ---------------------------------------------------------------------------
// /sync integration test — intentionally skipped.
//
// The POST /sync apply logic (src/routes/sync.ts) is fused to a live PostgreSQL
// connection: processEntity/processHistoryEvent take a pg PoolClient and run raw
// SQL (BEGIN/COMMIT transactions, ON CONFLICT upserts, the pairs.server_version
// monotonic counter, and the history_events_type_check CHECK constraint). The
// route also depends on the authenticateWithActivePair middleware to derive the
// active pair id from a JWT. None of this can be exercised meaningfully without a
// real Postgres, and per the task scope we deliberately do NOT stand one up here.
//
// To turn this into a true integration test, a future change would need either:
//   1. a disposable test Postgres (e.g. testcontainers / a CI-provisioned DB) with
//      migrations 001-005 applied, then build the Fastify app and POST /sync with a
//      signed JWT for a seeded pair; or
//   2. an in-memory Postgres such as `pg-mem` wired into src/config/database.ts via
//      dependency injection (the route currently imports the pool directly, so the
//      DB layer would first have to be made injectable).
//
// Until then, the conflict-resolution core — the only genuinely pure, DB-free unit
// of the sync path — is covered exhaustively by the suite above.
// ---------------------------------------------------------------------------
describe.skip('POST /sync apply logic (needs a test DB / pg-mem)', () => {
  it('applies client changes, bumps server_version, and returns server_changes', () => {
    // See block comment above for what this requires.
  });

  it('rejects cross-pair writes for an id owned by another pair', () => {
    // Requires seeded rows across two pairs in a real DB.
  });

  it('treats history_events as append-only (no update of existing ids)', () => {
    // Requires a real history_events table with the CHECK constraint.
  });
});
