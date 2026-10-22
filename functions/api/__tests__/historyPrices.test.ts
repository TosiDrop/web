// @vitest-environment node
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { Env } from '../../types/env';
import { onRequestGet } from '../history';

describe('receipt prices', () => {
  it('uses the latest positive quote before delivery with matching source and timestamp', async () => {
    const sqlite = new DatabaseSync(':memory:');
    try {
      sqlite.exec(`
        CREATE TABLE withdrawals (
          network TEXT, stake_address TEXT, reward_id TEXT, token TEXT,
          amount TEXT, epoch INTEGER, delivered_on TEXT, delivered_at INTEGER,
          withdrawal_request TEXT
        );
        CREATE TABLE market_asset_price_history (
          network TEXT, unit TEXT, source TEXT, price_usd REAL, observed_at INTEGER
        );
        INSERT INTO withdrawals VALUES ('preview', 'stake-test', 'r1', 'lovelace',
          '1000000', 500, '1750000000', 1750000000, 'w1');
        INSERT INTO market_asset_price_history VALUES
          ('preview', 'lovelace', 'valid', 2, 1749999900),
          ('preview', 'lovelace', 'zero', 0, 1749999920),
          ('preview', 'lovelace', 'negative', -3, 1749999940),
          ('preview', 'lovelace', 'infinite', 1e999, 1749999960),
          ('preview', 'lovelace', 'future', 5, 1750000001),
          ('mainnet', 'lovelace', 'wrong-network', 7, 1750000000);
      `);
      const db = {
        prepare(sql: string) {
          return {
            bind(...values: Array<string | number>) {
              return {
                all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
                first: async () => sqlite.prepare(sql).get(...values),
              };
            },
          };
        },
      } as unknown as D1Database;
      const response = await onRequestGet({
        request: new Request('https://example.com/api/history?staking_address=stake-test'),
        env: { DB: db } as Env,
      } as Parameters<typeof onRequestGet>[0]);
      expect(response.status).toBe(200);
      const body = await response.json() as { items: Array<Record<string, unknown>> };
      expect(body.items[0]).toMatchObject({
        receiptPriceUsd: 2,
        receiptPriceObservedAt: 1749999900,
        receiptPriceSource: 'valid',
      });
    } finally {
      sqlite.close();
    }
  });
});
