import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import {
  completeDepartmentHeadDiagnosis,
  completeDiagnosis,
  saveDepartmentHeadDiagnosis,
  saveHeadquartersDirection,
} from '@/app/diagnoses/actions';
import {
  diagnosisStatusLabel,
  firstRelation,
  type DiagnosisSummaryItem,
  type GrowthDirectionItem,
  type GrowthPointItem,
} from '@/lib/diagnosis/utils';
import {
  getEvaluationAccess,
  resolveActorEmployeeId,
} from '@/lib/evaluation/access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : '';
}

function summaryDefaults(value: unknown): DiagnosisSummaryItem[] {
  const categories = ['성장', '신뢰', '전문성', '감각'] as const;
  const rows = Array.isArray(value) ? value : [];

  return categories.map((category) => {
    const found = rows.find(
      (item) =>
        item &&
        typeof item === 'object' &&
        'category' in item &&
        item.category === category,
    ) as Partial<DiagnosisSummaryItem> | undefined;

    return {
      category,
      content: found?.content ?? '',
      evidence: found?.evidence ?? '',
    };
  });
}

function growthDefaults(value: unknown): GrowthPointItem[] {
  const categories = ['성과', '역량', '태도'] as const;
  const rows = Array.isArray(value) ? value : [];

  return categories.map((category) => {
    const found = rows.find(
      (item) =>
        item &&
        typeof item === 'object' &&
        'category' in item &&
        item.category === category,
    ) as Partial<GrowthPointItem> | undefined;

    return {
      category,
      detail: found?.detail ?? '',
      reason: found?.reason ?? '',
    };
  });
}

function directionDefaults(value: unknown): GrowthDirectionItem[] {
  const rows = Array.isArray(value)
    ? (value as Partial<GrowthDirectionItem>[])
    : [];

  return [0, 1, 2].map((index) => ({
    area: rows[index]?.area ?? '',
    action: rows[index]?.action ?? '',
  }));
}

export default async function DiagnosisDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user } = await getEvaluationAccess();
  const actorId = await resolveActorEmployeeId(supabase, user);
  const admin = user.roles.some((role) =>
    ['hr_admin', 'super_admin'].includes(role),
  );

  const { data: diagnosis, error } = await supabase
    .from('personnel_diagnoses')
    .select(
      '*,employees:employees!personnel_diagnoses_employee_id_fkey(name,employee_no,departments(name),job_levels(name),positions(name)),evaluation_periods(name),department_head:employees!personnel_diagnoses_department_head_id_fkey(name,employee_no),headquarters_head:employees!personnel_diagnoses_headquarters_head_id_fkey(name,employee_no)',
    )
    .eq('id', id)
    .single();

  if (error || !diagnosis) notFound();

  const employee = firstRelation(diagnosis.employees);
  const department = firstRelation(employee?.departments);
  const jobLevel = firstRelation(employee?.job_levels);
  const position = firstRelation(employee?.positions);
  const period = firstRelation(diagnosis.evaluation_periods);
  const departmentHead = firstRelation(diagnosis.department_head);
  const headquartersHead = firstRelation(diagnosis.headquarters_head);

  const summary = summaryDefaults(diagnosis.diagnosis_summary);
  const growthPoints = growthDefaults(diagnosis.growth_points);
  const directions = directionDefaults(diagnosis.growth_directions);

  const canDepartmentHeadEdit =
    admin || actorId === diagnosis.department_head_id;

  const canHeadquartersEdit =
    admin ||
    actorId === diagnosis.headquarters_head_id ||
    (
      diagnosis.subject_is_department_head &&
      actorId === diagnosis.department_head_id
    );

  const departmentHeadRoleLabel = diagnosis.subject_is_department_head
    ? '본부장'
    : '부서장';

  return (
    <PageShell
      title={`${employee?.name ?? '구성원'} 인사진단`}
      description="첨부 Excel 양식을 그대로 웹 인사진단으로 관리합니다."
    >
      <Notice success={param(sp.success)} error={param(sp.error)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {diagnosisStatusLabel(
              diagnosis.status,
              diagnosis.subject_is_department_head,
            )}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {diagnosis.subject_is_department_head
              ? '부서장/리더 대상'
              : '일반 구성원 대상'}
          </span>
        </div>

        <div className="flex gap-2">
          <Link
            href="/diagnoses"
            className="rounded-xl border px-4 py-2 text-sm font-semibold"
          >
            작성 목록
          </Link>
          <Link
            href="/diagnoses/results"
            className="rounded-xl border px-4 py-2 text-sm font-semibold"
          >
            결과 목록
          </Link>
        </div>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">부서</div>
            <div className="mt-1 font-bold">{department?.name ?? '-'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">직무레벨</div>
            <div className="mt-1 font-bold">{jobLevel?.name ?? '-'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">성명 / 직책</div>
            <div className="mt-1 font-bold">
              {employee?.name ?? '-'} · {position?.name ?? '-'}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-3">
          <div className="text-sm">
            <span className="text-slate-500">평가기간</span>
            <div className="font-semibold">{period?.name ?? '-'}</div>
          </div>
          <div className="text-sm">
            <span className="text-slate-500">
              ①② 담당 · {departmentHeadRoleLabel}
            </span>
            <div className="font-semibold">
              {departmentHead?.employee_no ?? '-'} · {departmentHead?.name ?? '-'}
            </div>
          </div>
          <div className="text-sm">
            <span className="text-slate-500">③ 성장방향 · 본부장</span>
            <div className="font-semibold">
              {headquartersHead?.employee_no ?? departmentHead?.employee_no ?? '-'} ·{' '}
              {headquartersHead?.name ?? departmentHead?.name ?? '-'}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          원본: {diagnosis.source_file_name ?? '-'}
          {diagnosis.source_uploaded_at
            ? ` · 업로드 ${new Date(
                diagnosis.source_uploaded_at,
              ).toLocaleString('ko-KR')}`
            : ''}
        </div>
      </Card>

      <form className="space-y-5">
        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-black">1. 진단 요약</h2>
            <p className="mt-1 text-sm text-slate-500">
              {diagnosis.subject_is_department_head
                ? '본부장이 관찰 내용과 Excel 정보를 바탕으로 진단을 요약합니다.'
                : '부서장이 관찰 내용과 구성원 Excel 정보를 바탕으로 진단을 요약합니다.'}
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <div className="grid min-w-[800px] grid-cols-[120px_1fr_1.5fr] bg-slate-100 text-sm font-bold">
              <div className="border-r p-3 text-center">구분</div>
              <div className="border-r p-3 text-center">진단 내용</div>
              <div className="p-3 text-center">진단 근거</div>
            </div>

            {summary.map((item, index) => (
              <div
                key={item.category}
                className="grid min-w-[800px] grid-cols-[120px_1fr_1.5fr] border-t"
              >
                <div className="flex items-center justify-center border-r p-3 font-bold">
                  {item.category}
                </div>
                <div className="border-r p-2">
                  <textarea
                    name={`summary_${index}_content`}
                    defaultValue={item.content}
                    disabled={!canDepartmentHeadEdit}
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm disabled:bg-slate-50"
                  />
                </div>
                <div className="p-2">
                  <textarea
                    name={`summary_${index}_evidence`}
                    defaultValue={item.evidence}
                    disabled={!canDepartmentHeadEdit}
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm disabled:bg-slate-50"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-black">2. 성장 포인트 도출</h2>
            <p className="mt-1 text-sm text-slate-500">
              {diagnosis.subject_is_department_head
                ? '본부장이 진단 내용을 바탕으로 부족하거나 보완이 필요한 성장 포인트를 정합니다.'
                : '부서장이 진단 내용을 바탕으로 부족하거나 보완이 필요한 성장 포인트를 정합니다.'}
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <div className="grid min-w-[800px] grid-cols-[120px_1fr_1.5fr] bg-blue-50 text-sm font-bold">
              <div className="border-r p-3 text-center">구분</div>
              <div className="border-r p-3 text-center">세부항목</div>
              <div className="p-3 text-center">
                관찰 내용 및 보완이 필요한 이유
              </div>
            </div>

            {growthPoints.map((item, index) => (
              <div
                key={item.category}
                className="grid min-w-[800px] grid-cols-[120px_1fr_1.5fr] border-t"
              >
                <div className="flex items-center justify-center border-r p-3 font-bold">
                  {item.category}
                </div>
                <div className="border-r p-2">
                  <textarea
                    name={`growth_${index}_detail`}
                    defaultValue={item.detail}
                    disabled={!canDepartmentHeadEdit}
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm disabled:bg-slate-50"
                  />
                </div>
                <div className="p-2">
                  <textarea
                    name={`growth_${index}_reason`}
                    defaultValue={item.reason}
                    disabled={!canDepartmentHeadEdit}
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm disabled:bg-slate-50"
                  />
                </div>
              </div>
            ))}
          </div>

          {canDepartmentHeadEdit && (
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                formAction={saveDepartmentHeadDiagnosis.bind(null, id)}
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
              >
                ①② 임시저장
              </button>
              <button
                formAction={completeDepartmentHeadDiagnosis.bind(null, id)}
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
              >
                {diagnosis.subject_is_department_head
                  ? '본부장 진단 확정'
                  : '부서장 진단 확정'}
              </button>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-black">3. 성장 방향 제안</h2>
            <p className="mt-1 text-sm text-slate-500">
              본부장이 진단 요약과 성장 포인트를 바탕으로 앞으로의 성장 방향과
              구체적인 시도 방안을 제안합니다.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <div className="grid min-w-[700px] grid-cols-[1fr_1.8fr] bg-emerald-50 text-sm font-bold">
              <div className="border-r p-3 text-center">성장 영역</div>
              <div className="p-3 text-center">
                구체적인 목표 또는 시도 방안
              </div>
            </div>

            {directions.map((item, index) => (
              <div
                key={index}
                className="grid min-w-[700px] grid-cols-[1fr_1.8fr] border-t"
              >
                <div className="border-r p-2">
                  <textarea
                    name={`direction_${index}_area`}
                    defaultValue={item.area}
                    disabled={!canHeadquartersEdit}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm disabled:bg-slate-50"
                  />
                </div>
                <div className="p-2">
                  <textarea
                    name={`direction_${index}_action`}
                    defaultValue={item.action}
                    disabled={!canHeadquartersEdit}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm disabled:bg-slate-50"
                  />
                </div>
              </div>
            ))}
          </div>

          {canHeadquartersEdit && (
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                formAction={saveHeadquartersDirection.bind(null, id)}
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
              >
                ③ 임시저장
              </button>
              <button
                formAction={completeDiagnosis.bind(null, id)}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
              >
                인사진단 최종 완료
              </button>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-black">4. 기타 코멘트</h2>
          <textarea
            name="other_comment"
            defaultValue={diagnosis.other_comment ?? ''}
            disabled={!canDepartmentHeadEdit && !canHeadquartersEdit}
            rows={6}
            className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm disabled:bg-slate-50"
            placeholder="기타 전달하거나 기록할 내용을 작성합니다."
          />
        </Card>
      </form>
    </PageShell>
  );
}
