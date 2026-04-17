export function HistoryPageHeader() {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Claim History</h1>
        <p className="mt-0.5 text-sm text-gray-400">
          Track past and pending reward claims.
        </p>
      </div>
      <button
        disabled
        title="Coming soon"
        aria-label="Export claim history as CSV"
        className="rounded-md border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-gray-400 opacity-50 cursor-not-allowed"
      >
        Export CSV
      </button>
    </div>
  );
}
