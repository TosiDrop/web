-- custom_request charges an overhead fee for non-whitelisted pools on top of
-- the withdrawal/token/tx components; persist it so fee totals are complete.
-- ADD COLUMN fails on a second application, which aborts the batch (see the
-- guard note in 0005).
ALTER TABLE claim_requests ADD COLUMN overhead_fee TEXT;
