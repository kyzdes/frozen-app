-- Fix history_events type constraint for iOS enum values
ALTER TABLE history_events DROP CONSTRAINT IF EXISTS history_events_type_check;
ALTER TABLE history_events ADD CONSTRAINT history_events_type_check
  CHECK (type IN (
    'item_added', 'item_updated', 'item_deleted',
    'packages_changed', 'items_changed',
    'itemAdded', 'quantityChanged'
  ));

-- Make item_id and category_id nullable (iOS sends them as optional)
ALTER TABLE history_events ALTER COLUMN item_id DROP NOT NULL;
ALTER TABLE history_events ALTER COLUMN category_id DROP NOT NULL;
