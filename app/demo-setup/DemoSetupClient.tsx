'use client';

import { useState } from 'react';

type Result = { ok: boolean; message: string; accounts?: { label: string; email: string; employeeNo: string }[] };

export function DemoSetupClient({ enabled }: { enabled: boolean }) {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run(action: 'create' | 'delete') {
    if (!enabled || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/demo-setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret, action }),
      });
      const data = (await response.json()) as Result;
      setResult(data);
    } catch {
      setResult({ ok: false, message: '요청 처리 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-2xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm font-bold text-blue-700">STEP 4 · 개발용 설정</div>
      <h1 className="mt-2 text-2xl font-black">Demo Auth 계정 생성</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        이 화면은 개발 테스트 전용입니다. Vercel의 DEMO_SETUP_ENABLED=true일 때만 동작하며,
        입력한 Setup Secret은 브라우저에 저장하지 않습니다.
      </p>

      {!enabled ? (
        <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          현재 Demo Setup이 비활성화되어 있습니다. Vercel Environment Variables에서 DEMO_SETUP_ENABLED를 true로 설정해야 합니다.
        </div>
      ) : (
        <>
          <label className="mt-6 block text-sm font-semibold text-slate-700">
            DEMO_SETUP_SECRET
            <input
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
              placeholder="Vercel에 등록한 Setup Secret"
            />
          </label>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => run('create')}
              disabled={!secret || loading}
              className="rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? '처리 중...' : 'Demo 계정 생성/재설정'}
            </button>
            <button
              type="button"
              onClick={() => run('delete')}
              disabled={!secret || loading}
              className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-50"
            >
              Demo 계정 삭제
            </button>
          </div>
        </>
      )}

      {result ? (
        <div className={`mt-6 rounded-xl p-4 text-sm ${result.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          <div className="font-semibold">{result.message}</div>
          {result.accounts?.length ? (
            <div className="mt-3 space-y-1 text-xs">
              {result.accounts.map((account) => (
                <div key={account.email}>{account.label} · {account.email} · {account.employeeNo}</div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
        테스트가 끝나면 Demo 계정을 삭제하고 DEMO_SETUP_ENABLED=false, NEXT_PUBLIC_DEMO_MODE=false로 바꾸는 것을 권장합니다.
      </div>
    </div>
  );
}
