// Last-Write-Wins conflict resolution algorithm

interface Record {
  updated_at: string;
  deleted_at?: string | null;
}

export function resolveConflict<T extends Record>(
  clientRecord: T,
  serverRecord: T | null
): { winner: 'client' | 'server'; data: T } {
  // Case 1: Record doesn't exist on server -> client wins
  if (!serverRecord) {
    return { winner: 'client', data: clientRecord };
  }

  // Case 2: Soft delete handling
  const clientDeleted = clientRecord.deleted_at !== null && clientRecord.deleted_at !== undefined;
  const serverDeleted = serverRecord.deleted_at !== null && serverRecord.deleted_at !== undefined;

  if (clientDeleted && serverDeleted) {
    // Both deleted -> latest deletion wins
    return new Date(clientRecord.deleted_at!) > new Date(serverRecord.deleted_at!)
      ? { winner: 'client', data: clientRecord }
      : { winner: 'server', data: serverRecord };
  }

  if (clientDeleted) {
    // Client deleted, server updated -> latest operation wins
    return new Date(clientRecord.deleted_at!) > new Date(serverRecord.updated_at)
      ? { winner: 'client', data: clientRecord }
      : { winner: 'server', data: serverRecord };
  }

  if (serverDeleted) {
    // Server deleted, client updated -> latest operation wins
    return new Date(serverRecord.deleted_at!) > new Date(clientRecord.updated_at)
      ? { winner: 'server', data: serverRecord }
      : { winner: 'client', data: clientRecord };
  }

  // Case 3: Both updated (no deletion)
  const clientTime = new Date(clientRecord.updated_at).getTime();
  const serverTime = new Date(serverRecord.updated_at).getTime();

  if (clientTime > serverTime) {
    return { winner: 'client', data: clientRecord };
  } else if (serverTime > clientTime) {
    return { winner: 'server', data: serverRecord };
  } else {
    // Timestamps equal (rare) -> tie-breaker: server wins
    return { winner: 'server', data: serverRecord };
  }
}
