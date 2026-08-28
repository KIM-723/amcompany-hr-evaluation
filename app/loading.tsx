export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1,2,3].map(x => <div key={x} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}
