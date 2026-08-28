'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-8">
      <h1 className="text-xl font-bold text-red-700">화면을 불러오지 못했습니다.</h1>
      <p className="mt-3 text-sm text-slate-600">{error.message}</p>
      {error.digest && <p className="mt-2 text-xs text-slate-400">Digest: {error.digest}</p>}
      <button onClick={reset} className="mt-5 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white">
        다시 시도
      </button>
    </div>
  );
}
