import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { PeriodStatusBadge } from '@/components/evaluation-period/PeriodStatusBadge';
import { requireHrAdmin } from '@/lib/hr/admin';
import { stringParam } from '@/lib/hr/utils';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Period = {
  id: string;
  name: string;
  code: string | null;
  start_date: string;
  end_date: string;
  self_start_date: string | null;
  self_end_date: string | null;
  first_start_date: string | null;
  first_end_date: string | null;
  second_start_date: string | null;
  second_end_date: string | null;
  calibration_start_date: string | null;
  calibration_end_date: string | null;
  result_release_date: string | null;
  status: string;
};

function range(start: string | null, end: string | null) {
  if (!start && !end) return '-';
  return `${start ?? '-'} ~ ${end ?? '-'}`;
}

export default async function PeriodsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const keyword = stringParam(sp.q);
  const status = stringParam(sp.status);

  const { supabase } = await requireHrAdmin();

  let query = supabase
    .from('evaluation_periods')
    .select('id,name,code,start_date,end_date,self_start_date,self_end_date,first_start_date,first_end_date,second_start_date,second_end_date,calibration_start_date,calibration_end_date,result_release_date,status')
    .order('start_date', { ascending: false });

  if (keyword) query = query.ilike('name', `%${keyword}%`);
  if (status) query = query.eq('status', status);

  const [{ data: periodsData, error }, { data: assignmentsData }] = await Promise.all([
    query,
    supabase.from('evaluation_assignments').select('period_id,id'),
  ]);

  const periods = (periodsData ?? []) as Period[];
  const counts = new Map<string, number>();
  for (const row of assignmentsData ?? []) {
    counts.set(row.period_id, (counts.get(row.period_id) ?? 0) + 1);
  }

  return (
    <PageShell
      title="평가기간"
      description="평가기간을 생성하고 일정, 평가대상, 1·2차 평가자, 활성화 및 종료 상태를 관리합니다."
    >
      <Notice success={stringParam(sp.success)} error={stringParam(sp.error) || error?.message} />

      <Card>
        <form className="flex flex-col gap-3 md:flex-row">
          <input
            name="q"
            defaultValue={keyword}
            placeholder="평가기간명 검색"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
          />
          <select
            name="status"
            defaultValue={status}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">전체 상태</option>
            <option value="draft">초안</option>
            <option value="scheduled">예정</option>
            <option value="active">진행중</option>
            <option value="calibration">Calibration</option>
            <option value="closed">종료</option>
          </select>
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">
            검색
          </button>
          <Link
            href="/periods/new"
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-center text-sm font-semibold text-white"
          >
            + 평가기간 생성
          </Link>
        </form>
      </Card>

      <div className="grid gap-4">
        {periods.map((period) => (
          <Link key={period.id} href={`/periods/${period.id}`} className="block">
            <Card className="transition hover:border-blue-300">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">{period.name}</h2>
                    <PeriodStatusBadge status={period.status} />
                    {period.code && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                        {period.code}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    전체 {period.start_date} ~ {period.end_date} · 평가대상 {counts.get(period.id) ?? 0}명
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-slate-500 md:grid-cols-4">
                  <div><div className="font-semibold text-slate-700">자기평가</div>{range(period.self_start_date, period.self_end_date)}</div>
                  <div><div className="font-semibold text-slate-700">1차 평가</div>{range(period.first_start_date, period.first_end_date)}</div>
                  <div><div className="font-semibold text-slate-700">2차 평가</div>{range(period.second_start_date, period.second_end_date)}</div>
                  <div><div className="font-semibold text-slate-700">Calibration</div>{range(period.calibration_start_date, period.calibration_end_date)}</div>
                </div>
              </div>
            </Card>
          </Link>
        ))}

        {periods.length === 0 && (
          <Card>
            <div className="py-12 text-center text-sm text-slate-500">
              조건에 맞는 평가기간이 없습니다.
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
