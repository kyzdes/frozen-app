import { PoolClient } from 'pg';

/**
 * Permanently delete a user account and all of its server-side personal data,
 * satisfying the GDPR right-to-erasure / Apple Guideline 5.1.1(v) in-app
 * account-deletion requirement.
 *
 * Must be called inside an open transaction (the caller owns BEGIN/COMMIT).
 *
 * What gets removed, and why this order:
 *  1. Pairs where the user is the SOLE member are dropped outright. The
 *     `pairs -> categories/items/history_events/invites/pair_members` foreign
 *     keys are all `ON DELETE CASCADE`, so the entire freezer and its history
 *     disappear with the pair.
 *  2. For pairs that SURVIVE (a partner is still a member), the user may still
 *     be referenced by `invites.created_by` / `invites.used_by`. Those FKs have
 *     no `ON DELETE` action (RESTRICT), so they would block the user delete —
 *     we detach them explicitly. Invites created by the user are removed; an
 *     invite the user merely consumed is kept but its `used_by` is nulled so the
 *     surviving partner's pair stays intact.
 *  3. Finally the user row is deleted; `pair_members` and `auth_sessions`
 *     (`ON DELETE CASCADE`) follow automatically. The user's own
 *     `personal_pair_id` / `active_pair_id` pointers are irrelevant once the row
 *     is gone (and any surviving pair another member still references is left
 *     untouched).
 */
export async function deleteUserAccount(client: PoolClient, userId: string): Promise<void> {
  // 1. Drop pairs the user is the only member of (cascades their data + invites).
  await client.query(
    `DELETE FROM pairs p
       WHERE EXISTS (
               SELECT 1 FROM pair_members pm
               WHERE pm.pair_id = p.id AND pm.user_id = $1
             )
         AND (SELECT COUNT(*) FROM pair_members pm2 WHERE pm2.pair_id = p.id) = 1`,
    [userId]
  );

  // 2. Detach the user from invites in any pair that survived (FK = RESTRICT).
  await client.query('DELETE FROM invites WHERE created_by = $1', [userId]);
  await client.query('UPDATE invites SET used_by = NULL WHERE used_by = $1', [userId]);

  // 3. Delete the user (cascades pair_members + auth_sessions).
  await client.query('DELETE FROM users WHERE id = $1', [userId]);
}
