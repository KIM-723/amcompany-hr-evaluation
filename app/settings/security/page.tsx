import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { getEvaluationAccess } from '@/lib/evaluation/access';

export default async function SecurityHealth() {
  const { supabase } = await getEvaluationAccess();
  const { data: checks, error } = await supabase.rpc('security_health_check');
  const rows = (checks ?? []) as Array<{ check_name:string; status:string; detail:string }>;

  return (
    <PageShell title="권한 / 보안 점검" description="RLS, Service Role, Audit, FORCE_DEMO_LOGIN 등 운영 전 필수 보안항목을 확인합니다.">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error.message}</div>}
      <div className="grid gap-3">
        {rows.map((x)=><Card key={x.check_name}><div className="flex items-start justify-between gap-4"><div><b>{x.check_name}</b><p className="mt-1 text-sm text-slate-500">{x.detail}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${x.status==='PASS'?'bg-emerald-50 text-emerald-700':x.status==='WARN'?'bg-amber-50 text-amber-700':'bg-red-50 text-red-700'}`}>{x.status}</span></div></Card>)}
      </div>
      {process.env.FORCE_DEMO_LOGIN === 'true' && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><b>운영 전 필수:</b> FORCE_DEMO_LOGIN=true를 제거하고 정상 Supabase Auth + RLS로 전환해야 합니다.</div>}
    </PageShell>
  );
}
