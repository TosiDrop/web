-- custom_request charges an overhead fee for non-whitelisted pools on top of
-- the withdrawal/token/tx components; persist it so fee totals are complete.
-- Existing claim rows cannot be backfilled authoritatively, so NULL marks their
-- overhead component as unavailable. Analytics excludes those rows from the
-- complete fee total while retaining them in the tracked-claims count.
-- ADD COLUMN fails on a second application, which aborts the batch (see the
-- guard note in 0005).
ALTER TABLE claim_requests ADD COLUMN overhead_fee TEXT;
