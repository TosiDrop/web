export function StateMessage({ eyebrow, message }: { eyebrow: string; message: string }) {
  return (
    <div className="card-premium px-6 py-16 text-center">
      <p className="label-eyebrow">{eyebrow}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm text-slate-400">{message}</p>
    </div>
  );
}
