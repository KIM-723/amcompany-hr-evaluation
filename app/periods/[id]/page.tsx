import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { PeriodForm } from '@/components/evaluation-period/PeriodForm';
import { PeriodStatusBadge } from '@/components/evaluation-period/PeriodStatusBadge';
import { PeriodDeleteButton } from '@/components/evaluation-period/PeriodDeleteButton';
import {
  activatePeriod,
  addEvaluationTargets,
  clonePeriod,
  closePeriod,
  moveToCalibration,
  removeEvaluationTarget,
  setPeriodScheduled,
  updateAssignment,
  updatePeriod,
} from '@/app/periods/actions';
import { requireHrAdmin } from '@/lib/hr/admin';
import { stringParam } from '@/lib/hr/utils';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Employee = {
  id: string;
  employee_no: string;
  name: string;
  department_id: string | null;
  job_level_id: string | null;
  employment_status: string;
};

type Department = { id: string; name: string };
type JobLevel = { id: string; name: string };
type Template = { id: string; name: string; version: number };

type Assignment = {
  id: string;
  employee_id: string;
  first_evaluator_id: string | null;
  second_evaluator_id: string | null;
  template_id: string;
  status: string;
  current_stage: string;
};

export default async function PeriodDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireHrAdmin();

  const [
    { data: period, error: periodError },
    { data: assignmentsData },
    { data: employeesData },
    { data: departmentsData },
    { data: jobLevelsData },
    { data: templatesData },
  ] = await Promise.all([
    supabase.from('evaluation_periods').select('*').eq('id', id).single(),
    supabase.from('evaluation_assignments').select('id,employee_id,first_evaluator_id,second_evaluator_id,template_id,status,current_stage').eq('period_id', id).order('assigned_at'),
    supabase.from('employees').select('id,employee_no,name,department_id,job_level_id,employment_status').neq('employment_status', 'resigned').order('employee_no'),
    supabase.from('departments').select('id,name').eq('is_active', true).order('sort_order').order('name'),
    supabase.from('job_levels').select('id,name').eq('is_active', true).order('level_order'),
    supabase.from('evaluation_templates').select('id,name,version').eq('is_active', true).order('name'),
  ]);

  if (periodError || !period) notFound();

  // Supabase .in() cannot receive an empty array reliably on every PostgREST version,
  // so snapshot rows are fetched separately when assignments exist.
  const assignments = (assignmentsData ?? []) as Assignment[];
  let snapshotIds = new Set<string>();
  if (assignments.length > 0) {
    const { data: snapshots } = await supabase
      .from('evaluation_snapshots')
      .select('assignment_id')
      .in('assignment_id', assignments.map((x) => x.id));
    snapshotIds = new Set((snapshots ?? []).map((x) => x.assignment_id));
  }

  const employees = (employeesData ?? []) as Employee[];
  const departments = (departmentsData ?? []) as Department[];
  const jobLevels = (jobLevelsData ?? []) as JobLevel[];
  const templates = (templatesData ?? []) as Template[];

  const employeeMap = new Map(employees.map((x) => [x.id, x]));
  const departmentMap = new Map(departments.map((x) => [x.id, x.name]));
  const jobLevelMap = new Map(jobLevels.map((x) => [x.id, x.name]));
  const templateMap = new Map(templates.map((x) => [x.id, `${x.name} v${x.version}`]));
  const assignedEmployeeIds = new Set(assignments.map((x) => x.employee_id));
  const availableEmployees = employees.filter((x) => !assignedEmployeeIds.has(x.id));

  const editableAssignments = ['draft', 'scheduled'].includes(period.status);
  const canAddTargets = !['calibration', 'closed'].includes(period.status);
  const firstMissing = assignments.filter((x) => !x.first_evaluator_id).length;
  const secondMissing = assignments.filter((x) => !x.second_evaluator_id).length;

  return (
    <PageShell
      title={period.name}
      description="평가일정, 평가대상, 평가자, Template, Snapshot을 한 화면에서 관리합니다."
    >
      <Notice success={stringParam(sp.success)} error={stringParam(sp.error)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PeriodStatusBadge status={period.status} />
          {period.code && <span className="text-sm text-slate-500">{period.code}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/periods" className="rounded-xl border px-4 py-2 text-sm font-semibold">
            목록
          </Link>
          <form action={clonePeriod.bind(null, id)}>
            <button className="rounded-xl border px-4 py-2 text-sm font-semibold">복제</button>
          </form>
          {period.status === 'draft' && (
            <form action={setPeriodScheduled.bind(null, id)}>
              <button className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                예정으로 변경
              </button>
            </form>
          )}
          {['draft', 'scheduled'].includes(period.status) && (
            <form action={activatePeriod.bind(null, id)}>
              <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                평가 시작
              </button>
            </form>
          )}
          {period.status === 'active' && (
            <form action={moveToCalibration.bind(null, id)}>
              <button className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white">
                Calibration 전환
              </button>
            </form>
          )}
          {['active', 'calibration'].includes(period.status) && (
            <form action={closePeriod.bind(null, id)}>
              <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                평가 종료
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><div className="text-xs text-slate-500">평가대상</div><div className="mt-1 text-2xl font-bold">{assignments.length}명</div></Card>
        <Card><div className="text-xs text-slate-500">Snapshot</div><div className="mt-1 text-2xl font-bold">{snapshotIds.size}건</div></Card>
        <Card><div className="text-xs text-slate-500">1차 평가자 미지정</div><div className="mt-1 text-2xl font-bold">{firstMissing}명</div></Card>
        <Card><div className="text-xs text-slate-500">2차 평가자 미지정</div><div className="mt-1 text-2xl font-bold">{secondMissing}명</div></Card>
      </div>

      <Card>
        <div className="mb-4">
          <h2 className="font-bold">평가기간 정보</h2>
          <p className="mt-1 text-xs text-slate-500">
            평가 시작 시 평가대상별 기준 Snapshot이 생성됩니다. 종료된 평가기간은 수정할 수 없습니다.
          </p>
        </div>
        <PeriodForm
          action={updatePeriod.bind(null, id)}
          submitLabel="평가기간 수정"
          defaults={period}
        />
      </Card>

      <Card>
        <div className="mb-4">
          <h2 className="font-bold">평가대상 추가</h2>
          <p className="mt-1 text-xs text-slate-500">
            여러 명을 한 번에 추가할 수 있습니다. 추가 후 아래 목록에서 개별 평가자를 수정할 수 있습니다.
          </p>
        </div>

        {!canAddTargets ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Calibration 또는 종료 상태에서는 새로운 평가대상을 추가할 수 없습니다.
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
            활성 Evaluation Template이 없습니다. STEP 7 평가문항 관리에서 Template을 먼저 구성해주세요.
          </div>
        ) : (
          <form action={addEvaluationTargets.bind(null, id)} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <label className="text-sm font-medium">
                평가 Template *
                <select name="template_id" required className="mt-1 w-full rounded-xl border px-3 py-2.5">
                  <option value="">선택</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name} v{template.version}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                기본 1차 평가자
                <select name="first_evaluator_id" className="mt-1 w-full rounded-xl border px-3 py-2.5">
                  <option value="">미지정</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.employee_no} · {employee.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                기본 2차 평가자
                <select name="second_evaluator_id" className="mt-1 w-full rounded-xl border px-3 py-2.5">
                  <option value="">미지정</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.employee_no} · {employee.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
              {availableEmployees.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">추가 가능한 구성원이 없습니다.</div>
              ) : (
                <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-3">
                  {availableEmployees.map((employee) => (
                    <label key={employee.id} className="flex cursor-pointer gap-3 border-b border-r border-slate-100 p-3 text-sm hover:bg-slate-50">
                      <input type="checkbox" name="employee_ids" value={employee.id} className="mt-1" />
                      <span>
                        <span className="font-semibold">{employee.employee_no} · {employee.name}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {employee.department_id ? departmentMap.get(employee.department_id) ?? '-' : '-'} ·{' '}
                          {employee.job_level_id ? jobLevelMap.get(employee.job_level_id) ?? '-' : '-'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white">
                선택 대상 추가
              </button>
            </div>
          </form>
        )}
      </Card>

      <div>
        <div className="mb-3">
          <h2 className="text-lg font-bold">평가대상 / 평가자 지정</h2>
          <p className="mt-1 text-xs text-slate-500">
            평가 시작 후에는 Snapshot 보존을 위해 평가자와 Template 직접 변경을 제한합니다.
          </p>
        </div>

        <div className="grid gap-3">
          {assignments.map((assignment) => {
            const employee = employeeMap.get(assignment.employee_id);
            const updateAction = updateAssignment.bind(null, id, assignment.id);
            const removeAction = removeEvaluationTarget.bind(null, id, assignment.id);

            return (
              <Card key={assignment.id}>
                <div className="grid gap-4 xl:grid-cols-[1.1fr_2fr_auto] xl:items-end">
                  <div>
                    <div className="font-bold">
                      {employee?.employee_no ?? '-'} · {employee?.name ?? '알 수 없는 직원'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {employee?.department_id ? departmentMap.get(employee.department_id) ?? '-' : '-'} ·{' '}
                      {employee?.job_level_id ? jobLevelMap.get(employee.job_level_id) ?? '-' : '-'} ·{' '}
                      Snapshot {snapshotIds.has(assignment.id) ? '생성됨' : '대기'}
                    </div>
                  </div>

                  <form action={updateAction} className="grid gap-3 md:grid-cols-3">
                    <label className="text-xs font-semibold text-slate-600">
                      Template
                      <select
                        name="template_id"
                        defaultValue={assignment.template_id}
                        disabled={!editableAssignments}
                        className="mt-1 w-full rounded-lg border px-2 py-2 text-sm disabled:bg-slate-50"
                      >
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>{template.name} v{template.version}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                      1차 평가자
                      <select
                        name="first_evaluator_id"
                        defaultValue={assignment.first_evaluator_id ?? ''}
                        disabled={!editableAssignments}
                        className="mt-1 w-full rounded-lg border px-2 py-2 text-sm disabled:bg-slate-50"
                      >
                        <option value="">미지정</option>
                        {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                      2차 평가자
                      <select
                        name="second_evaluator_id"
                        defaultValue={assignment.second_evaluator_id ?? ''}
                        disabled={!editableAssignments}
                        className="mt-1 w-full rounded-lg border px-2 py-2 text-sm disabled:bg-slate-50"
                      >
                        <option value="">미지정</option>
                        {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </label>
                    {editableAssignments && (
                      <div className="md:col-span-3 flex justify-end">
                        <button className="rounded-lg border px-3 py-1.5 text-xs font-semibold">평가자 저장</button>
                      </div>
                    )}
                  </form>

                  {editableAssignments && (
                    <form action={removeAction}>
                      <button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">
                        대상 제외
                      </button>
                    </form>
                  )}
                </div>
              </Card>
            );
          })}

          {assignments.length === 0 && (
            <Card>
              <div className="py-10 text-center text-sm text-slate-500">
                아직 평가대상자가 지정되지 않았습니다.
              </div>
            </Card>
          )}
        </div>
      </div>

<Card className="border-red-200">
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h2 className="font-bold text-red-700">위험 영역 · 평가기간 영구삭제</h2>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">
        평가기간을 삭제하면 이 기간에 속한 평가대상, 자기평가, 1·2차 평가,
        평가응답, 결과, Calibration, History와 해당 평가결과에서 만들어진
        성장계획까지 함께 삭제됩니다. 복구할 수 없습니다.
      </p>
    </div>
    <PeriodDeleteButton
      periodId={id}
      periodName={period.name}
      assignmentCount={assignments.length}
    />
  </div>
</Card>
    </PageShell>
  );
}
