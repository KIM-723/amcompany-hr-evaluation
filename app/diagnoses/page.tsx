import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import {
  diagnosisStatusLabel,
  firstRelation,
} from '@/lib/diagnosis/utils';
import {
  getEvaluationAccess,
  resolveActorEmployeeId,
} from '@/lib/evaluation/access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : '';
}

export default async function DiagnosesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { supabase, user } = await getEvaluationAccess();
  const actorId = await resolveActorEmployeeId(supabase, user);
  const admin = user.roles.some((role) =>
    ['hr_admin', 'super_admin'].includes(role),
  );

  const { data: rows } = await supabase
    .from('personnel_diagnoses')
    .select(
      'id,period_id,employee_id,department_head_id,headquarters_head_id,subject_is_department_head,status,source_file_name,source_uploaded_at,updated_at,employees(name,employee_no,departments(name),positions(name)),evaluation_periods(name)',
    )
    .order('updated_at', { ascending: false });

  const visible = (rows ?? []).filter((row) => {
    if (admin) return true;

    return (
      row.department_head_id === actorId ||
      row.headquarters_head_id === actorId
    );
  });

  return (
    <PageShell
      title="인사진단 작성"
      description="Excel로 등록된 진단을 부서장과 본부장이 단계별로 검토·작성합니다."
    >
      <Notice success={param(sp.success)} error={param(sp.error)} />

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
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {row.subject_is_department_head
                        ? '부서장/리더 대상'
                        : '일반 구성원 대상'}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {diagnosisStatusLabel(
                        row.status,
                        row.subject_is_department_head,
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden text-right text-xs text-slate-400 md:block">
                    <div>{row.source_file_name ?? 'Excel 없음'}</div>
                    <div>
                      {row.source_uploaded_at
                        ? new Date(row.source_uploaded_at).toLocaleString('ko-KR')
                        : '-'}
                    </div>
                  </div>

                  <Link
                    href={`/diagnoses/${row.id}`}
                    className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    진단 열기
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}

        {visible.length === 0 && (
          <Card>
            <div className="py-12 text-center text-sm text-slate-500">
              작성할 인사진단이 없습니다. HR에서 구성원 Excel을 먼저 업로드해주세요.
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
