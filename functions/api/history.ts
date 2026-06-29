import type { Env } from '../types/env';
import { jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';
import { hasDb } from '../services/d1';
import { toUnixSeconds } from '../services/withdrawalsSync';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

interface WithdrawalRow {
  reward_id: string;
  token: string;
  amount: string;
  epoch: number | null;
  delivered_on: string;
  delivered_at: number | null;
  withdrawal_request: string | null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const params = new URL(request.url).searchParams;

  const stakingAddress = params.get('staking_address');
  if (!stakingAddress) {
    return errorResponse('staking_address is required', 400, origin);
  }

  const page = Number(params.get('page') ?? '1');
  if (!Number.isInteger(page) || page < 1) {
    return errorResponse('page must be a positive integer', 400, origin);
  }
  const limit = Number(params.get('limit') ?? String(DEFAULT_LIMIT));
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return errorResponse(`limit must be 1-${MAX_LIMIT}`, 400, origin);
  }
  const order = params.get('order') ?? 'desc';
  if (order !== 'asc' && order !== 'desc') {
    return errorResponse('order must be asc or desc', 400, origin);
  }
  const token = params.get('token');
  const from = params.get('from') ? toUnixSeconds(params.get('from')!) : null;
  if (params.get('from') && from === null) {
    return errorResponse('from must be a unix timestamp or date', 400, origin);
  }
  const to = params.get('to') ? toUnixSeconds(params.get('to')!) : null;
  if (params.get('to') && to === null) {
    return errorResponse('to must be a unix timestamp or date', 400, origin);
  }
  if (from !== null && to !== null && from > to) {
    return errorResponse('from must be <= to', 400, origin);
  }

  if (!hasDb(env)) {
    return jsonResponse(
      { items: [], page, limit, total: 0, hasMore: false, degraded: true },
      200,
      origin,
    );
  }

  const where: string[] = ['stake_address = ?'];
  const binds: unknown[] = [stakingAddress];
  if (token) {
    where.push('token = ?');
    binds.push(token);
  }
  if (from !== null) {
    where.push('delivered_at >= ?');
    binds.push(from);
  }
  if (to !== null) {
    where.push('delivered_at <= ?');
    binds.push(to);
  }
  const whereSql = where.join(' AND ');
  const dir = order === 'asc' ? 'ASC' : 'DESC';

  try {
    const [{ results }, count] = await Promise.all([
      env.DB.prepare(
        'SELECT reward_id, token, amount, epoch, delivered_on, delivered_at, withdrawal_request ' +
          `FROM withdrawals WHERE ${whereSql} ` +
          `ORDER BY (delivered_at IS NULL) ASC, delivered_at ${dir} ` +
          'LIMIT ? OFFSET ?',
      )
        .bind(...binds, limit + 1, (page - 1) * limit)
        .all<WithdrawalRow>(),
      env.DB.prepare(`SELECT COUNT(*) AS total FROM withdrawals WHERE ${whereSql}`)
        .bind(...binds)
        .first<{ total: number }>(),
    ]);

    const rows = results ?? [];
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((r) => ({
      rewardId: r.reward_id,
      token: r.token,
      amount: r.amount,
      epoch: r.epoch,
      deliveredOn: r.delivered_on,
      deliveredAt: r.delivered_at,
      withdrawalRequest: r.withdrawal_request,
    }));

    return jsonResponse(
      { items, page, limit, total: count?.total ?? items.length, hasMore },
      200,
      origin,
    );
  } catch (err) {
    console.error('D1 history error:', err);
    return errorResponse('Error fetching history', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
