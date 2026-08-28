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
};

export function EvaluatorTargetSelector({
  action,
  templates,
  leaders,
  executives,
  employees,
}: {
  action: (formData: FormData) => void | Promise<void>;
  templates: Template[];
  leaders: Person[];
  executives: Person[];
  employees: Person[];
}) {
  const [leaderId, setLeaderId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedLeader = useMemo(
    () => leaders.find((leader) => leader.id === leaderId) ?? null,
    [leaders, leaderId],
  );

  const members = useMemo(() => {
    if (!selectedLeader?.department_id) return [];

    return employees.filter(
      (employee) =>
        employee.department_id === selectedLeader.department_id &&
        employee.id !== selectedLeader.id,
    );
  }, [employees, selectedLeader]);

  function selectLeader(nextLeaderId: string) {
    setLeaderId(nextLeaderId);

    const leader = leaders.find((item) => item.id === nextLeaderId);

    if (!leader?.department_id) {
      setSelectedIds([]);
      return;
    }

    const memberIds = employees
      .filter(
        (employee) =>
          employee.department_id === leader.department_id &&
          employee.id !== leader.id,
      )
      .map((employee) => employee.id);

    // 리더 선택 즉시 같은 부서의 미등록 재직자 전원을 자동 체크
    setSelectedIds(memberIds);
  }

  function toggleEmployee(employeeId: string) {
    setSelectedIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  }

  function toggleAll() {
    const memberIds = members.map((employee) => employee.id);
    const allChecked =
      memberIds.length > 0 && memberIds.every((id) => selectedIds.includes(id));

    setSelectedIds(
      allChecked
        ? selectedIds.filter((id) => !memberIds.includes(id))
        : [...new Set([...selectedIds, ...memberIds])],
    );
  }

  const allChecked =
    members.length > 0 && members.every((member) => selectedIds.includes(member.id));

  return (
    <form action={action} className="space-y-5">
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
          1차 평가자 · 리더 *
          <select
            name="first_evaluator_id"
            value={leaderId}
            onChange={(event) => selectLeader(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          >
            <option value="">리더 선택</option>
            {leaders.map((leader) => (
              <option key={leader.id} value={leader.id}>
                {leader.employee_no} · {leader.name} · {leader.department_name || '부서 미지정'}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs font-normal text-slate-400">
            리더를 선택하면 해당 리더와 같은 부서의 재직자가 자동 조회·체크됩니다.
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
          {executives.length === 0 && (
            <span className="mt-1 block text-xs font-normal text-red-500">
              직책관리에서 2차평가 임원 직책을 먼저 지정해주세요.
            </span>
          )}
        </label>
      </div>

      {!leaderId ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          1차 평가자인 리더를 먼저 선택해주세요.
        </div>
      ) : !selectedLeader?.department_id ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          선택한 리더의 부서가 지정되어 있지 않습니다. 직원관리에서 리더의 부서를 먼저 지정해주세요.
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <b>{selectedLeader.department_name}</b>에 추가 가능한 미등록 재직자가 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3">
            <div>
              <div className="font-bold">
                {selectedLeader.department_name} · {members.length}명 조회
              </div>
              <div className="mt-1 text-xs text-slate-500">
                선택한 리더 본인은 제외됩니다. 현재{' '}
                {selectedIds.filter((id) => members.some((member) => member.id === id)).length}명 선택
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              전체 선택
            </label>
          </div>

          <div className="grid max-h-96 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
            {members.map((employee) => {
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
            !leaderId ||
            !selectedLeader?.department_id ||
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
