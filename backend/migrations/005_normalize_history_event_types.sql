-- KYZ-271 (M0.1): Normalize history_events.type to the 5 canonical snake_case values.
--
-- Background: 001_initial.sql originally created the CHECK constraint allowing ONLY
-- the camelCase values ('itemAdded', 'quantityChanged'), and 002_fix_schema.sql widened
-- it to allow both the camelCase and snake_case forms. As a result the table may contain
-- legacy rows whose `type` is still camelCase. This migration normalizes those rows and
-- tightens the CHECK constraint to exactly the 5 canonical snake_case values.
--
-- Canonical set: item_added, item_updated, item_deleted, packages_changed, items_changed
-- Legacy mapping: itemAdded -> item_added, quantityChanged -> items_changed
--
-- Idempotent: re-running is safe (UPDATEs match nothing once normalized; constraint is
-- dropped IF EXISTS before being re-added).

-- 1. Normalize any legacy camelCase rows to their canonical snake_case equivalents.
UPDATE history_events SET type = 'item_added'    WHERE type = 'itemAdded';
UPDATE history_events SET type = 'items_changed' WHERE type = 'quantityChanged';

-- 2. Tighten the CHECK constraint to the 5 canonical values only.
ALTER TABLE history_events DROP CONSTRAINT IF EXISTS history_events_type_check;
ALTER TABLE history_events ADD CONSTRAINT history_events_type_check
  CHECK (type IN (
    'item_added', 'item_updated', 'item_deleted',
    'packages_changed', 'items_changed'
  ));
