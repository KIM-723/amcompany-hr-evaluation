import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import {
  firstRelation,
  diagnosisStatusLabel,
} from '@/lib/diagnosis/utils';
import {
  getEvaluationAccess,
  resolveActorEmployeeId,
} from '@/lib/evaluation/access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DiagnosisResultsPage() {
  const { supabase, user } = await getEvaluationAccess();
  const actorId = await resolveActorEmployeeId(supabase, user);
  const admin = user.roles.some((role) =>
    ['hr_admin', 'super_admin'].includes(role),
  );

  const { data: rows } = await supabase
    .from('personnel_diagnoses')
    .select(
      'id,employee_id,subject_is_department_head,status,headquarters_head_completed_at,employees(name,employee_no,departments(name),positions(name)),evaluation_periods(name)',
    )
    .eq('status', 'completed')
    .order('headquarters_head_completed_at', { ascending: false });

  const visible = (rows ?? []).filter((row) => {
    if (admin) return true;
    return row.employee_id === actorId;
  });

  return (
    <PageShell
      title="인사진단 결과"
      description="완료된 진단 요약, 성장 포인트, 본부장 성장 방향을 확인합니다."
    >
      <div className="grid gap-3">
        {visible.map((row) => {
          const employee = firstRelation(row.employees);
          const department = firstRelation(employee?.departments);
          const position = firstRelation(employee?.positions);
          const period = firstRelation(row.evaluation_periods);

          return (
            <Card key={row.id}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-bold">
                    {employee?.employee_no ?? '-'} · {employee?.name ?? '-'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {department?.name ?? '-'} · {position?.name ?? '-'} ·{' '}
                    {period?.name ?? '-'}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-emerald-700">
                    {diagnosisStatusLabel(
                      row.status,
                      row.subject_is_department_head,
                    )}
                  </div>
                </div>

                <Link
                  href={`/diagnoses/${row.id}`}
                  className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  결과 보기
                </Link>
              </div>
            </Card>
          );
        })}

        {visible.length === 0 && (
          <Card>
            <div className="py-12 text-center text-sm text-slate-500">
              완료된 인사진단 결과가 없습니다.
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
