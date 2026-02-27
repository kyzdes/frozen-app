-- Ensure one user cannot be a member of multiple pairs concurrently.
CREATE UNIQUE INDEX IF NOT EXISTS ux_pair_members_user_id
  ON pair_members(user_id);
