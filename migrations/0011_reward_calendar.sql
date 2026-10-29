CREATE TABLE IF NOT EXISTS reward_announcements (
  id TEXT PRIMARY KEY,
  network TEXT NOT NULL CHECK(network IN ('mainnet','preview')),
  project_id TEXT NOT NULL,
  owner_address TEXT NOT NULL,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  description TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  signed_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(network, signature_hash)
);
CREATE INDEX IF NOT EXISTS reward_announcements_range ON reward_announcements(network, starts_at);
CREATE TABLE IF NOT EXISTS reward_reminders (
  id TEXT PRIMARY KEY,
  network TEXT NOT NULL CHECK(network IN ('mainnet','preview')),
  event_id TEXT NOT NULL,
  offset_minutes INTEGER NOT NULL CHECK(offset_minutes IN (0,15,60,1440)),
  subscription TEXT NOT NULL,
  subscription_hash TEXT NOT NULL,
  management_hash TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  next_attempt_at TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_until TEXT,
  lease_token TEXT,
  delivered_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(network, event_id, offset_minutes, subscription_hash)
);
CREATE INDEX IF NOT EXISTS reward_reminders_due ON reward_reminders(network, state, next_attempt_at);

CREATE INDEX IF NOT EXISTS reward_reminders_capacity ON reward_reminders(network, state, scheduled_at);
