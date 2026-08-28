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

  const { data: rows, error } = await supabase
    .from('personnel_diagnoses')
    .select(
      'id,employee_id,department_head_id,headquarters_head_id,subject_is_department_head,status,source_file_name,source_uploaded_at,headquarters_head_completed_at,updated_at,employees:employees!personnel_diagnoses_employee_id_fkey(name,employee_no,departments(name),positions(name)),evaluation_periods(name)',
    )
    .order('updated_at', { ascending: false });

  if (error) {
    return (
      <PageShell
        title="인사진단 결과"
        description="Excel 업로드 이후부터 최종 완료까지 전체 인사진단 진행현황을 확인합니다."
      >
        <Card>
          <div className="py-10 text-center text-sm text-red-600">
            진단 데이터를 불러오지 못했습니다: {error.message}
          </div>
        </Card>
      </PageShell>
    );
  }

  const visible = (rows ?? []).filter((row) => {
    if (admin) return true;

    return (
      row.employee_id === actorId ||
      row.department_head_id === actorId ||
      row.headquarters_head_id === actorId
    );
  });

  const completedCount = visible.filter((row) => row.status === 'completed').length;
  const inProgressCount = visible.length - completedCount;

  return (
    <PageShell
      title="인사진단 결과"
      description="Excel 업로드 직후부터 부서장 진단, 본부장 성장방향, 최종완료까지 전체 진행현황을 확인합니다."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <div className="text-xs text-slate-500">전체 진단</div>
          <div className="mt-1 text-2xl font-bold">{visible.length}건</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">작성 진행중</div>
          <div className="mt-1 text-2xl font-bold">{inProgressCount}건</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">최종 완료</div>
          <div className="mt-1 text-2xl font-bold">{completedCount}건</div>
        </Card>
      </div>

      <div className="grid gap-3">
        {visible.map((row) => {
          const employee = firstRelation(row.employees);
          const department = firstRelation(employee?.departments);
          const position = firstRelation(employee?.positions);
          const period = firstRelation(row.evaluation_periods);
          const completed = row.status === 'completed';

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

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        completed
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {diagnosisStatusLabel(
                        row.status,
                        row.subject_is_department_head,
                      )}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {row.subject_is_department_head
                        ? '부서장/리더 대상'
                        : '일반 구성원 대상'}
                    </span>
                  </div>

                  {row.source_file_name && (
                    <div className="mt-2 text-xs text-slate-400">
                      Excel: {row.source_file_name}
                      {row.source_uploaded_at
                        ? ` · ${new Date(row.source_uploaded_at).toLocaleString('ko-KR')}`
                        : ''}
                    </div>
                  )}
                </div>

                <Link
                  href={`/diagnoses/${row.id}`}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    completed
                      ? 'bg-emerald-700 text-white'
                      : 'bg-navy-900 text-white'
                  }`}
                >
                  {completed ? '진단 결과 보기' : '진단 작성/확인'}
                </Link>
              </div>
            </Card>
          );
        })}

        {visible.length === 0 && (
          <Card>
            <div className="py-12 text-center text-sm text-slate-500">
              등록된 인사진단이 없습니다. Excel 업로드 결과에서 등록 성공 여부를 확인해주세요.
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
