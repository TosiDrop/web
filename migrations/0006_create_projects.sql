-- Migration: project registrations from the onboarding portal. Owners
-- (wallet-authenticated stake addresses) register a token + optional pool and
-- a distribution proposal; the TosiDrop team flips `status` out of band.
-- `distribution` is a JSON blob so the proposal shape can evolve without DDL.
CREATE TABLE IF NOT EXISTS projects (
  id            TEXT PRIMARY KEY,
  network       TEXT NOT NULL,
  owner_address TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  website       TEXT,
  logo_url      TEXT,
  token_id      TEXT NOT NULL,
  pool_id       TEXT,
  distribution  TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at   TEXT,
  -- SHA-256 of the CIP-30 signature that last wrote the row; unique per
  -- network so one signed create request yields at most one project.
  signature_hash TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_signature
  ON projects (network, signature_hash);

CREATE INDEX IF NOT EXISTS idx_projects_owner
  ON projects (network, owner_address, created_at DESC);
