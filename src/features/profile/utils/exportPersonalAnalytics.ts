import type { PersonalAnalyticsData } from './personalAnalytics';

export function personalAnalyticsCsvRows(data: Pick<PersonalAnalyticsData, 'claimsByMonth' | 'seriesByToken'>) {
  const rows: Array<Array<string | number | null>> = [[
    'record_type', 'month', 'token_id', 'ticker', 'claims', 'reward_amount', 'cumulative_reward',
  ]];
  for (const point of data.claimsByMonth) {
    rows.push(['claims', point.month, '', '', point.claims, '', '']);
  }
  for (const series of Object.values(data.seriesByToken)) {
    for (const point of series.points) {
      rows.push(['reward', point.month, series.token, series.ticker, '', point.amount, point.cumulative]);
    }
  }
  return rows;
}
