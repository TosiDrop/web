export function ConnectingStep() {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      {/* Animated spinner */}
      <div className="relative mb-8">
        <div className="h-16 w-16 animate-spin rounded-full border-2 border-transparent border-t-brand-cyan" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-cyan/20 to-brand-teal/20" />
        </div>
      </div>

      <h2 className="mb-2 text-xl font-semibold text-white">
        Connecting...
      </h2>
      <p className="text-sm text-slate-400">
        Please approve the connection in your wallet extension.
      </p>
    </div>
  );
}
