import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { PeriodForm } from '@/components/evaluation-period/PeriodForm';
import { PeriodStatusBadge } from '@/components/evaluation-period/PeriodStatusBadge';
import { PeriodDeleteButton } from '@/components/evaluation-period/PeriodDeleteButton';
import { EvaluatorTargetSelector } from '@/components/evaluation-period/EvaluatorTargetSelector';
import {
  activatePeriod,
  addEvaluationTargets,
  clonePeriod,
  closePeriod,
  moveToCalibration,
  releaseCalibration,
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
  position_id: string | null;
  leader_id: string | null;
  is_leader: boolean;
  employment_status: string;
};

type Department = { id: string; name: string; parent_id: string | null };
type JobLevel = { id: string; name: string };
type Position = {
  id: string;
  name: string;
  evaluation_role: 'none' | 'leader' | 'division_head' | 'executive';
};
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
    { data: positionsData },
    { data: templatesData },
  ] = await Promise.all([
    supabase.from('evaluation_periods').select('*').eq('id', id).single(),
    supabase
      .from('evaluation_assignments')
      .select('id,employee_id,first_evaluator_id,second_evaluator_id,template_id,status,current_stage')
      .eq('period_id', id)
      .order('assigned_at'),
    supabase
      .from('employees')
      .select('id,employee_no,name,department_id,job_level_id,position_id,leader_id,is_leader,employment_status')
      .neq('employment_status', 'resigned')
      .order('employee_no'),
    supabase.from('departments').select('id,name,parent_id').eq('is_active', true).order('sort_order').order('name'),
    supabase.from('job_levels').select('id,name').eq('is_active', true).order('level_order'),
    supabase.from('positions').select('id,name,evaluation_role').eq('is_active', true).order('sort_order').order('name'),
    supabase.from('evaluation_templates').select('id,name,version').eq('is_active', true).order('name'),
  ]);

  if (periodError || !period) notFound();

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
  const positions = (positionsData ?? []) as Position[];
  const templates = (templatesData ?? []) as Template[];

  const employeeMap = new Map(employees.map((x) => [x.id, x]));
  const departmentMap = new Map(departments.map((x) => [x.id, x.name]));
  const jobLevelMap = new Map(jobLevels.map((x) => [x.id, x.name]));
  const positionMap = new Map(positions.map((x) => [x.id, x]));
  const assignedEmployeeIds = new Set(assignments.map((x) => x.employee_id));

  const leaderPositionIds = new Set(
    positions.filter((position) => position.evaluation_role === 'leader').map((position) => position.id),
  );

  const executivePositionIds = new Set(
    positions.filter((position) => position.evaluation_role === 'executive').map((position) => position.id),
  );

  const divisionHeadPositionIds = new Set(
    positions.filter((position) => position.evaluation_role === 'division_head').map((position) => position.id),
  );

  const leaders = employees.filter(
    (employee) =>
      employee.is_leader ||
      (!!employee.position_id && leaderPositionIds.has(employee.position_id)),
  );

  const divisionHeads = employees.filter(
    (employee) =>
      !!employee.position_id && divisionHeadPositionIds.has(employee.position_id),
  );

  const executives = employees.filter(
    (employee) =>
      !!employee.position_id && executivePositionIds.has(employee.position_id),
  );

  const availableEmployees = employees.filter(
    (employee) => !assignedEmployeeIds.has(employee.id),
  );

  const selectorEmployees = availableEmployees.map((employee) => ({
    id: employee.id,
    employee_no: employee.employee_no,
    name: employee.name,
    department_id: employee.department_id,
    department_name: employee.department_id ? departmentMap.get(employee.department_id) ?? '' : '',
    job_level_name: employee.job_level_id ? jobLevelMap.get(employee.job_level_id) ?? '' : '',
    position_name: employee.position_id ? positionMap.get(employee.position_id)?.name ?? '' : '',
    evaluator_role: employee.position_id
      ? positionMap.get(employee.position_id)?.evaluation_role ?? (employee.is_leader ? 'leader' : 'none')
      : (employee.is_leader ? 'leader' : 'none'),
  }));

  const selectorLeaders = leaders.map((employee) => ({
    id: employee.id,
    employee_no: employee.employee_no,
    name: employee.name,
    department_id: employee.department_id,
    department_name: employee.department_id ? departmentMap.get(employee.department_id) ?? '' : '',
    job_level_name: employee.job_level_id ? jobLevelMap.get(employee.job_level_id) ?? '' : '',
    position_name: employee.position_id ? positionMap.get(employee.position_id)?.name ?? '' : '',
    evaluator_role: employee.position_id
      ? positionMap.get(employee.position_id)?.evaluation_role ?? (employee.is_leader ? 'leader' : 'none')
      : (employee.is_leader ? 'leader' : 'none'),
  }));

  const selectorDivisionHeads = divisionHeads.map((employee) => ({
    id: employee.id,
    employee_no: employee.employee_no,
    name: employee.name,
    department_id: employee.department_id,
    department_name: employee.department_id ? departmentMap.get(employee.department_id) ?? '' : '',
    job_level_name: employee.job_level_id ? jobLevelMap.get(employee.job_level_id) ?? '' : '',
    position_name: employee.position_id ? positionMap.get(employee.position_id)?.name ?? '' : '',
    evaluator_role: 'division_head' as const,
  }));

  const selectorExecutives = executives.map((employee) => ({
    id: employee.id,
    employee_no: employee.employee_no,
    name: employee.name,
    department_id: employee.department_id,
    department_name: employee.department_id ? departmentMap.get(employee.department_id) ?? '' : '',
    job_level_name: employee.job_level_id ? jobLevelMap.get(employee.job_level_id) ?? '' : '',
    position_name: employee.position_id ? positionMap.get(employee.position_id)?.name ?? '' : '',
    evaluator_role: employee.position_id
      ? positionMap.get(employee.position_id)?.evaluation_role ?? (employee.is_leader ? 'leader' : 'none')
      : (employee.is_leader ? 'leader' : 'none'),
  }));

  const editableAssignments = ['draft', 'scheduled'].includes(period.status);
  const canAddTargets = !['calibration', 'closed'].includes(period.status);
  const firstMissing = assignments.filter((x) => !x.first_evaluator_id).length;
  const secondMissing = assignments.filter((x) => !x.second_evaluator_id).length;
  const calibrationRound = Number(period.calibration_round ?? 0);

  return (
    <PageShell
      title={period.name}
      description="리더 소속 구성원을 자동 배정하고 1차=리더, 2차=임원 체계로 평가자를 관리합니다."
    >
      <Notice success={stringParam(sp.success)} error={stringParam(sp.error)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <PeriodStatusBadge status={period.status} />
          {period.code && <span className="text-sm text-slate-500">{period.code}</span>}
          {calibrationRound > 0 && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Calibration {calibrationRound}차
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/periods" className="rounded-xl border px-4 py-2 text-sm font-semibold">목록</Link>

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
                {calibrationRound > 0 ? `Calibration ${calibrationRound + 1}차 다시 시작` : 'Calibration 시작'}
              </button>
            </form>
          )}

          {period.status === 'calibration' && (
            <form action={releaseCalibration.bind(null, id)}>
              <button className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700">
                Calibration 해제
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

      {period.status === 'calibration' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          현재 Calibration {calibrationRound}차 진행중입니다.
          <b> Calibration 해제</b>를 누르면 평가기간 상태만 다시 진행중으로 돌아가며,
          이미 조정된 점수와 변경이력은 삭제하지 않습니다. 이후 다시 Calibration을 시작할 수 있습니다.
        </div>
      )}

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
            평가 시작 시 평가대상별 기준 Snapshot이 생성됩니다.
          </p>
        </div>
        <PeriodForm action={updatePeriod.bind(null, id)} submitLabel="평가기간 수정" defaults={period} />
      </Card>

      <Card>
        <div className="mb-4">
          <h2 className="font-bold">평가대상 자동배정</h2>
          <p className="mt-1 text-sm text-slate-500">
            <b>일반 구성원 평가</b>는 리더 선택 → 같은 부서 일반 구성원 자동조회,
            <b>리더 평가</b>는 본부장 선택 → 해당 본부 산하 부서 리더 자동조회 방식입니다.
            2차 평가자는 <b>임원</b>만 선택할 수 있습니다.
          </p>
        </div>

        {!canAddTargets ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Calibration 또는 종료 상태에서는 평가대상을 추가할 수 없습니다.
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
            활성 Evaluation Template이 없습니다. 평가문항에서 Template을 먼저 구성해주세요.
          </div>
        ) : leaders.length === 0 ? (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
            1차 평가자로 사용할 리더가 없습니다. 직원관리의 리더 여부 또는 직책관리의 평가자 구분을 확인해주세요.
          </div>
        ) : (
          <EvaluatorTargetSelector
            action={addEvaluationTargets.bind(null, id)}
            templates={templates}
            leaders={selectorLeaders}
            divisionHeads={selectorDivisionHeads}
            executives={selectorExecutives}
            employees={selectorEmployees}
            departments={departments}
          />
        )}
      </Card>

      <div>
        <div className="mb-3">
          <h2 className="text-lg font-bold">평가대상 / 평가자 지정</h2>
          <p className="mt-1 text-xs text-slate-500">
            평가 시작 전에는 개별 수정할 수 있습니다. 1차 평가자는 대상자와 같은 부서의 리더여야 합니다.
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
                      {employee?.position_id ? positionMap.get(employee.position_id)?.name ?? '-' : '-'} ·{' '}
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
                          <option key={template.id} value={template.id}>
                            {template.name} v{template.version}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-xs font-semibold text-slate-600">
                      1차 평가자 · 리더
                      <select
                        name="first_evaluator_id"
                        required
                        defaultValue={assignment.first_evaluator_id ?? ''}
                        disabled={!editableAssignments}
                        className="mt-1 w-full rounded-lg border px-2 py-2 text-sm disabled:bg-slate-50"
                      >
                        <option value="">선택</option>
                        {leaders.map((leader) => (
                          <option key={leader.id} value={leader.id}>
                            {leader.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-xs font-semibold text-slate-600">
                      2차 평가자 · 임원
                      <select
                        name="second_evaluator_id"
                        required
                        defaultValue={assignment.second_evaluator_id ?? ''}
                        disabled={!editableAssignments}
                        className="mt-1 w-full rounded-lg border px-2 py-2 text-sm disabled:bg-slate-50"
                      >
                        <option value="">선택</option>
                        {executives.map((executive) => (
                          <option key={executive.id} value={executive.id}>
                            {executive.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {editableAssignments && (
                      <div className="md:col-span-3 flex justify-end">
                        <button className="rounded-lg border px-3 py-1.5 text-xs font-semibold">
                          평가자 저장
                        </button>
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
              평가기간을 삭제하면 해당 기간의 진단·평가·결과·Calibration 데이터까지 함께 삭제됩니다.
            </p>
          </div>
          <PeriodDeleteButton periodId={id} periodName={period.name} assignmentCount={assignments.length} />
        </div>
      </Card>
    </PageShell>
  );
}
