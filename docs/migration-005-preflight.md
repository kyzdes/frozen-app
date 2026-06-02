# Migration 005 — Pre-flight / Go-No-Go Runbook

`backend/migrations/005_normalize_history_event_types.sql` normalizes
`history_events.type` to the 5 canonical snake_case values and tightens the
`history_events_type_check` CHECK constraint to exactly those 5 values.

This is a **data-normalizing** migration that has only ever run against
build/unit fixtures, never against live prod data (KI-001). It must be proven
**before** the backend merges to `main`, because **`main` auto-deploys prod**
(G-002) and the migration runner applies pending migrations on deploy. Treat
this as a gate, not a step.

## What 005 does

1. Rewrites legacy camelCase rows to canonical snake_case:
   - `itemAdded` → `item_added`
   - `quantityChanged` → `items_changed`
2. Drops `history_events_type_check` (IF EXISTS) and re-adds it allowing **only**
   the 5 canonical values: `item_added`, `item_updated`, `item_deleted`,
   `packages_changed`, `items_changed`.

It is idempotent: the `UPDATE`s match nothing once rows are normalized, and the
constraint is dropped before being re-added.

## Pre-flight query

Run against the target database (staging first, then prod) **before** applying 005:

```sql
SELECT type, COUNT(*) FROM history_events GROUP BY type;
```

## Acceptance condition (GO)

Every existing `type` value returned must be in the allowed pre-migration set:

```
itemAdded, quantityChanged,            -- 2 legacy (will be rewritten by step 1)
item_added, item_updated, item_deleted, packages_changed, items_changed  -- 5 canonical (kept as-is)
```

If the pre-flight returns **only** values from that 7-value set → **GO**. Step 1
remaps the 2 legacy values, step 2's `ADD CONSTRAINT` then succeeds because every
remaining row holds one of the 5 canonical values.

## If an unexpected value appears (NO-GO)

If the pre-flight returns **any** `type` outside the 7-value set above (e.g. a
typo, a third legacy spelling, an empty string, or `NULL`):

- **Do not apply 005 to prod.** Step 2's `ALTER TABLE ... ADD CONSTRAINT
  history_events_type_check` would **fail** — the new CHECK only permits the 5
  canonical values, and any row outside `{item_added, item_updated,
  item_deleted, packages_changed, items_changed}` (after step 1 remaps the 2
  legacy values) violates it, aborting the migration transaction.
- Decide the correct canonical mapping for the unexpected value, add an explicit
  `UPDATE history_events SET type = '<canonical>' WHERE type = '<unexpected>';`
  to 005 **before** the `ADD CONSTRAINT`, re-prove on staging, then proceed.
- Guardrail D-006: the canonical set is fixed at the 5 snake_case values. Do
  **not** widen the constraint to keep a non-canonical value alive — remap it
  instead.

## Procedure

1. Run the pre-flight query on **staging**; confirm GO.
2. Apply 005 on staging (`node backend/migrations/run.js` or the deploy runner);
   re-run the pre-flight — expect only the 5 canonical values, 0 legacy rows.
3. Re-run 005 on staging to confirm idempotency (0 rows changed, constraint
   re-added cleanly).
4. Run the pre-flight query on **prod**; confirm GO. Only then merge the backend
   change to `main` (which auto-deploys and applies 005 to prod).

## Rollback note

If 005 fails mid-flight, its transaction aborts and no rows/constraint changes
persist. The legacy CHECK from `002_fix_schema.sql` (which permits both camelCase
and snake_case) remains in force, so the app keeps working on the old constraint
while the unexpected value is investigated.

## References

- Migration: `backend/migrations/005_normalize_history_event_types.sql`
- Constraint history: `backend/migrations/001_initial.sql` (camelCase-only),
  `backend/migrations/002_fix_schema.sql` (widened to both casings)
- KI-001 (this gate), D-006 (canonical 5-value set), G-002 (`main` auto-deploys prod)
