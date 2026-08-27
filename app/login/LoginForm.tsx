'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const DEMO_ACCOUNTS = [
  ['직원', 'employee@amcompany.demo'],
  ['1차 평가자', 'first@amcompany.demo'],
  ['2차 평가자', 'second@amcompany.demo'],
  ['리더', 'leader@amcompany.demo'],
  ['HR 관리자', 'hr@amcompany.demo'],
  ['최고관리자', 'admin@amcompany.demo'],
] as const;

const DEMO_PASSWORD = 'Amcompany!2026';

function isValidHttpUrl(value: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

type LoginFormProps = {
  demoMode: boolean;
  supabaseUrl: string;
  supabaseKey: string;
};

export function LoginForm({ demoMode, supabaseUrl, supabaseKey }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const configStatus = useMemo(
    () => ({
      hasUrl: isValidHttpUrl(supabaseUrl),
      hasKey: Boolean(supabaseKey),
    }),
    [supabaseKey, supabaseUrl],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    if (!configStatus.hasUrl || !configStatus.hasKey) {
      if (!configStatus.hasUrl && !configStatus.hasKey) {
        setError('Supabase URL과 Publishable/Anon Key가 연결되지 않았습니다.');
      } else if (!configStatus.hasUrl) {
        setError('NEXT_PUBLIC_SUPABASE_URL을 확인해주세요.');
      } else {
        setError('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인해주세요.');
      }
      setLoading(false);
      return;
    }

    try {
      const supabase = createBrowserClient(supabaseUrl, supabaseKey);
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(`로그인 실패: ${signInError.message}`);
        setLoading(false);
        return;
      }

      window.location.assign('/dashboard');
    } catch (loginError) {
      setError(loginError instanceof Error ? `로그인 오류: ${loginError.message}` : '로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  }

  function chooseDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError('');
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <div className="text-xl font-black text-navy-950">AMCOMPANY</div>
      <div className="mt-1 text-xs text-slate-500">성장 · 신뢰 · 전문성 · 감각</div>
      <h1 className="mt-8 text-2xl font-bold">인사진단 시스템 로그인</h1>
      <p className="mt-2 text-sm text-slate-500">회사 계정으로 로그인해주세요.</p>

      <form className="mt-6 space-y-3" onSubmit={submit}>
        <label className="block text-sm font-semibold text-slate-700">
          이메일
          <input
            className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-blue-500"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          비밀번호
          <input
            className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-blue-500"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        <button
          className="w-full rounded-xl bg-navy-900 p-3 font-semibold text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      {demoMode ? (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">개발용 Demo 계정</div>
            <div className="text-[11px] text-slate-400">공통 비밀번호 자동 입력</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map(([label, demoEmail]) => (
              <button
                type="button"
                key={demoEmail}
                onClick={() => chooseDemo(demoEmail)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-left text-xs hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="font-semibold text-slate-800">{label}</div>
                <div className="mt-0.5 truncate text-[10px] text-slate-400">{demoEmail}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
