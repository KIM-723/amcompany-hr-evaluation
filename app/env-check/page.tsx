export const dynamic = 'force-dynamic';

function Status({ ok }: { ok: boolean }) {
  return <span className={ok ? 'font-bold text-emerald-700' : 'font-bold text-red-700'}>{ok ? '연결됨' : '없음'}</span>;
}

export default function EnvCheckPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serverSecret = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const demoSetupEnabled = process.env.DEMO_SETUP_ENABLED === 'true';
  const demoSetupSecret = Boolean(process.env.DEMO_SETUP_SECRET?.trim());

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold text-slate-950">환경변수 연결 점검</h1>
        <p className="mt-2 text-sm text-slate-500">실제 Key 값은 표시하지 않고 연결 여부만 확인합니다.</p>
        <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {[
            ['NEXT_PUBLIC_SUPABASE_URL', Boolean(url)],
            ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', Boolean(publishable)],
            ['NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy)', Boolean(anon)],
            ['SUPABASE_SECRET_KEY / SERVICE_ROLE_KEY', Boolean(serverSecret)],
            ['NEXT_PUBLIC_DEMO_MODE=true', demoMode],
            ['DEMO_SETUP_ENABLED=true', demoSetupEnabled],
            ['DEMO_SETUP_SECRET', demoSetupSecret],
          ].map(([label, ok]) => (
            <div key={String(label)} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <span className="font-medium text-slate-700">{label}</span>
              <Status ok={Boolean(ok)} />
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
          Supabase 공개 Key는 Publishable Key 또는 legacy Anon Key 중 하나만 연결되어 있으면 됩니다.
        </div>
      </div>
    </main>
  );
}
