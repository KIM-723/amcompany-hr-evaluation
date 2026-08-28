'use client';

import { useMemo, useState } from 'react';

type Template = { id: string; name: string; version: number };

type Person = {
  id: string;
  employee_no: string;
  name: string;
  department_id: string | null;
  department_name: string;
  job_level_name: string;
  position_name: string;
  evaluator_role: 'none' | 'leader' | 'division_head' | 'executive';
};

type Department = {
  id: string;
  name: string;
  parent_id: string | null;
};

type Mode = 'member' | 'leader';

export function EvaluatorTargetSelector({
  action,
  templates,
  leaders,
  divisionHeads,
  executives,
  employees,
  departments,
}: {
  action: (formData: FormData) => void | Promise<void>;
  templates: Template[];
  leaders: Person[];
  divisionHeads: Person[];
  executives: Person[];
  employees: Person[];
  departments: Department[];
}) {
  const [mode, setMode] = useState<Mode>('member');
  const [firstEvaluatorId, setFirstEvaluatorId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const firstEvaluators = mode === 'member' ? leaders : divisionHeads;

  const selectedEvaluator = useMemo(
    () => firstEvaluators.find((person) => person.id === firstEvaluatorId) ?? null,
    [firstEvaluators, firstEvaluatorId],
  );

  const descendantDepartmentIds = useMemo(() => {
    if (!selectedEvaluator?.department_id) return new Set<string>();

    const result = new Set<string>();
    let frontier = [selectedEvaluator.department_id];

    // 본부장의 소속 조직 자체는 평가대상 부서에서 제외하고,
    // 그 하위조직부터 재귀적으로 조회한다.
    while (frontier.length > 0) {
      const next: string[] = [];

      for (const department of departments) {
        if (department.parent_id && frontier.includes(department.parent_id) && !result.has(department.id)) {
          result.add(department.id);
          next.push(department.id);
        }
      }

      frontier = next;
    }

    return result;
  }, [departments, selectedEvaluator]);

  const targets = useMemo(() => {
    if (!selectedEvaluator?.department_id) return [];

    if (mode === 'member') {
      // 일반 구성원 평가:
      // 리더와 동일 부서 / 리더 본인은 제외 / 리더·본부장·임원 직책 제외
      return employees.filter(
        (employee) =>
          employee.department_id === selectedEvaluator.department_id &&
          employee.id !== selectedEvaluator.id &&
          employee.evaluator_role === 'none',
      );
    }

    // 리더 평가:
    // 본부장 소속 조직의 하위조직들 중 직책이 리더인 직원만 조회
    return employees.filter(
      (employee) =>
        employee.department_id !== null &&
        descendantDepartmentIds.has(employee.department_id) &&
        employee.evaluator_role === 'leader',
    );
  }, [employees, mode, selectedEvaluator, descendantDepartmentIds]);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setFirstEvaluatorId('');
    setSelectedIds([]);
  }

  function selectFirstEvaluator(nextId: string) {
    setFirstEvaluatorId(nextId);

    const evaluator = firstEvaluators.find((item) => item.id === nextId);
    if (!evaluator?.department_id) {
      setSelectedIds([]);
      return;
    }

    if (mode === 'member') {
      setSelectedIds(
        employees
          .filter(
            (employee) =>
              employee.department_id === evaluator.department_id &&
              employee.id !== evaluator.id &&
              employee.evaluator_role === 'none',
          )
          .map((employee) => employee.id),
      );
      return;
    }

    const descendantIds = new Set<string>();
    let frontier = [evaluator.department_id];

    while (frontier.length > 0) {
      const next: string[] = [];

      for (const department of departments) {
        if (department.parent_id && frontier.includes(department.parent_id) && !descendantIds.has(department.id)) {
          descendantIds.add(department.id);
          next.push(department.id);
        }
      }

      frontier = next;
    }

    setSelectedIds(
      employees
        .filter(
          (employee) =>
            employee.department_id !== null &&
            descendantIds.has(employee.department_id) &&
            employee.evaluator_role === 'leader',
        )
        .map((employee) => employee.id),
    );
  }

  function toggleEmployee(employeeId: string) {
    setSelectedIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  }

  function toggleAll() {
    const targetIds = targets.map((employee) => employee.id);
    const allChecked =
      targetIds.length > 0 && targetIds.every((id) => selectedIds.includes(id));

    setSelectedIds(
      allChecked
        ? selectedIds.filter((id) => !targetIds.includes(id))
        : [...new Set([...selectedIds, ...targetIds])],
    );
  }

  const allChecked =
    targets.length > 0 && targets.every((employee) => selectedIds.includes(employee.id));

  const firstLabel = mode === 'member' ? '1차 평가자 · 리더' : '1차 평가자 · 본부장';

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="assignment_mode" value={mode} />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-bold">평가대상 구분</div>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className={`cursor-pointer rounded-xl border px-4 py-3 text-sm ${mode === 'member' ? 'border-blue-400 bg-blue-50 font-bold text-blue-800' : 'bg-white'}`}>
            <input
              type="radio"
              name="mode_radio"
              checked={mode === 'member'}
              onChange={() => changeMode('member')}
              className="mr-2"
            />
            일반 구성원 평가
            <span className="ml-2 text-xs font-normal text-slate-500">같은 부서 리더 → 구성원</span>
          </label>

          <label className={`cursor-pointer rounded-xl border px-4 py-3 text-sm ${mode === 'leader' ? 'border-violet-400 bg-violet-50 font-bold text-violet-800' : 'bg-white'}`}>
            <input
              type="radio"
              name="mode_radio"
              checked={mode === 'leader'}
              onChange={() => changeMode('leader')}
              className="mr-2"
            />
            리더 평가
            <span className="ml-2 text-xs font-normal text-slate-500">본부장 → 산하부서 리더</span>
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <label className="text-sm font-medium">
          평가 Template *
          <select
            name="template_id"
            required
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          >
            <option value="">선택</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} v{template.version}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          {firstLabel} *
          <select
            name="first_evaluator_id"
            value={firstEvaluatorId}
            onChange={(event) => selectFirstEvaluator(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          >
            <option value="">{mode === 'member' ? '리더 선택' : '본부장 선택'}</option>
            {firstEvaluators.map((person) => (
              <option key={person.id} value={person.id}>
                {person.employee_no} · {person.name} · {person.department_name || '부서 미지정'}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs font-normal text-slate-400">
            {mode === 'member'
              ? '리더 선택 → 같은 부서 일반 구성원 자동조회'
              : '본부장 선택 → 본부 산하 부서의 리더 자동조회'}
          </span>
        </label>

        <label className="text-sm font-medium">
          2차 평가자 · 임원 *
          <select
            name="second_evaluator_id"
            required
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          >
            <option value="">임원 선택</option>
            {executives.map((executive) => (
              <option key={executive.id} value={executive.id}>
                {executive.employee_no} · {executive.name} · {executive.position_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!firstEvaluatorId ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          {mode === 'member' ? '리더를 선택해주세요.' : '본부장을 선택해주세요.'}
        </div>
      ) : !selectedEvaluator?.department_id ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          선택한 평가자의 부서가 지정되어 있지 않습니다.
        </div>
      ) : targets.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          {mode === 'member'
            ? `${selectedEvaluator.department_name}에 추가 가능한 일반 구성원이 없습니다.`
            : `${selectedEvaluator.department_name} 산하 조직에서 추가 가능한 리더가 없습니다.`}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3">
            <div>
              <div className="font-bold">
                {mode === 'member'
                  ? `${selectedEvaluator.department_name} · 일반 구성원 ${targets.length}명`
                  : `${selectedEvaluator.department_name} 산하 · 리더 ${targets.length}명`}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                전원 자동체크됩니다. 필요하면 일부만 해제할 수 있습니다.
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              전체 선택
            </label>
          </div>

          <div className="grid max-h-96 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
            {targets.map((employee) => {
              const checked = selectedIds.includes(employee.id);

              return (
                <label
                  key={employee.id}
                  className={`flex cursor-pointer gap-3 border-b border-r p-4 ${
                    checked ? 'bg-blue-50/60' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="employee_ids"
                    value={employee.id}
                    checked={checked}
                    onChange={() => toggleEmployee(employee.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-semibold">
                      {employee.employee_no} · {employee.name}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {employee.department_name || '-'} · {employee.job_level_name || '-'} ·{' '}
                      {employee.position_name || '직책 미지정'}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          disabled={
            !firstEvaluatorId ||
            !selectedEvaluator?.department_id ||
            selectedIds.length === 0 ||
            executives.length === 0
          }
          className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          선택 구성원 평가대상 등록
        </button>
      </div>
    </form>
  );
}
