'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { bulkDeleteEmployees, deleteEmployeeCompletely } from '@/app/employees/actions';

export type EmployeeDeleteRow = {
  id: string;
  employee_no: string;
  name: string;
  department_name: string;
  job_level_name: string;
  position_name: string;
  hire_date: string;
  resignation_date: string | null;
  employment_status: string;
  is_leader: boolean;
};

export function SingleEmployeeDeleteButton({
  employeeId,
  employeeLabel,
}: {
  employeeId: string;
  employeeLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    const ok = window.confirm(
      `${employeeLabel} 직원을 영구 삭제합니다.\n\n` +
      `• 해당 직원의 모든 진단/평가/관찰/성장 데이터가 삭제됩니다.\n` +
      `• 해당 직원이 평가자로 작성한 평가도 삭제됩니다.\n` +
      `• 다른 직원의 평가자/리더 지정에서는 해제됩니다.\n` +
      `• 이 작업은 되돌릴 수 없습니다.\n\n계속하시겠습니까?`,
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteEmployeeCompletely(employeeId);
      if (!result.ok) {
        window.alert(result.message);
        return;
      }
      window.alert(result.message);
      router.push('/employees');
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={remove}
      className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
    >
      {pending ? '삭제 중...' : '직원 영구삭제'}
    </button>
  );
}

export function EmployeeBulkDeleteTable({ rows }: { rows: EmployeeDeleteRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.length === rows.length;

  function toggleAll() {
    setSelected(allSelected ? [] : rows.map((x) => x.id));
  }

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function removeSelected() {
    if (selected.length === 0) return;

    const names = rows
      .filter((x) => selected.includes(x.id))
      .slice(0, 8)
      .map((x) => `${x.employee_no} ${x.name}`)
      .join(', ');

    const ok = window.confirm(
      `선택한 ${selected.length}명을 영구 삭제합니다.\n\n` +
      `${names}${selected.length > 8 ? ' 외' : ''}\n\n` +
      `선택 직원의 모든 진단/평가/관찰/성장 데이터도 함께 삭제되며 복구할 수 없습니다.\n계속하시겠습니까?`,
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await bulkDeleteEmployees(selected);
      window.alert(result.message);
      if (result.ok) {
        setSelected([]);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div className="text-sm text-slate-500">
          {selected.length > 0 ? <b className="text-slate-800">{selected.length}명 선택됨</b> : '삭제할 직원을 체크하세요.'}
        </div>
        <button
          type="button"
          onClick={removeSelected}
          disabled={selected.length === 0 || pending}
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? '일괄 삭제 중...' : `선택 ${selected.length}명 일괄삭제`}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
              {['사번','이름','부서','직급','직책','입사일','퇴사일','리더','상태',''].map((h)=>
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggle(e.id)} />
                </td>
                <td className="px-4 py-3 font-medium">{e.employee_no}</td>
                <td className="px-4 py-3">{e.name}</td>
                <td className="px-4 py-3">{e.department_name || '-'}</td>
                <td className="px-4 py-3">{e.job_level_name || '-'}</td>
                <td className="px-4 py-3">{e.position_name || '-'}</td>
                <td className="px-4 py-3">{e.hire_date}</td>
                <td className="px-4 py-3">{e.resignation_date || '-'}</td>
                <td className="px-4 py-3">{e.is_leader ? 'Y' : '-'}</td>
                <td className="px-4 py-3">
                  {e.employment_status === 'resigned' ? (
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-bold text-white">퇴사</span>
                  ) : e.employment_status === 'leave' ? (
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">휴직</span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">재직</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <a href={`/employees/${e.id}`} className="font-semibold text-blue-700">상세/수정</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="py-14 text-center text-sm text-slate-500">조건에 맞는 직원이 없습니다.</div>
      )}
    </div>
  );
}
