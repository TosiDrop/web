import { QueueCount } from './QueueCount';

export function ClaimPageHeader() {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-white">Rewards</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Claim your Cardano token rewards
        </p>
      </div>
      <div className="mt-1.5 shrink-0">
        <QueueCount />
      </div>
    </div>
  );
}
