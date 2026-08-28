import { notFound } from 'next/navigation';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { EmployeeForm } from '@/components/hr/EmployeeForm';
import { EmployeeStatusBadge } from '@/components/hr/StatusBadge';
import { ResignedBadge } from '@/components/hr/ResignedBadge';
import { SingleEmployeeDeleteButton } from '@/components/hr/EmployeeDeleteControls';
import { Notice } from '@/components/hr/Notice';
import { updateEmployee, setEmployeeStatus } from '@/app/employees/actions';
import { requireHrAdmin } from '@/lib/hr/admin';
import { loadEmployeeFormOptions } from '@/lib/hr/form-options';
import { firstRelationName, stringParam } from '@/lib/hr/utils';

type PageParams = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type EmployeeDetail = {
  id:string;
  employee_no:string;
  name:string;
  email:string|null;
  phone:string|null;
  hire_date:string;
  resignation_date:string|null;
  employment_status:string;
  employment_type:string;
  department_id:string|null;
  job_level_id:string|null;
  position_id:string|null;
  leader_id:string|null;
  is_leader:boolean;
  notes:string|null;
  user_id:string|null;
  departments:{name:string}|{name:string}[]|null;
  job_levels:{name:string}|{name:string}[]|null;
  positions:{name:string}|{name:string}[]|null;
};

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireHrAdmin();

  const [{ data }, options] = await Promise.all([
    supabase
      .from('employees')
      .select('id,employee_no,name,email,phone,hire_date,resignation_date,employment_status,employment_type,department_id,job_level_id,position_id,leader_id,is_leader,notes,user_id,departments(name),job_levels(name),positions(name)')
      .eq('id', id)
      .maybeSingle(),
    loadEmployeeFormOptions(supabase),
  ]);

  const employee = data as unknown as EmployeeDetail | null;
  if (!employee) notFound();

  const action = updateEmployee.bind(null, id);
  const activeAction = setEmployeeStatus.bind(null, id, 'active');
  const leaveAction = setEmployeeStatus.bind(null, id, 'leave');
  const resignAction = setEmployeeStatus.bind(null, id, 'resigned');
  const today = new Date().toISOString().slice(0, 10);

  return (
    <PageShell title={`${employee.name} · ${employee.employee_no}`} description="직원 상세정보·퇴사일·재직상태와 영구삭제를 관리합니다.">
      <Notice success={stringParam(sp.success)} error={stringParam(sp.error)} />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card>
          <div className="text-xs text-slate-500">현재 상태</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <EmployeeStatusBadge status={employee.employment_status}/>
            <ResignedBadge status={employee.employment_status} resignationDate={employee.resignation_date}/>
          </div>
        </Card>
        <Card><div className="text-xs text-slate-500">부서</div><div className="mt-2 font-semibold">{firstRelationName(employee.departments) ?? '-'}</div></Card>
        <Card><div className="text-xs text-slate-500">직급 / 직책</div><div className="mt-2 font-semibold">{firstRelationName(employee.job_levels) ?? '-'} / {firstRelationName(employee.positions) ?? '-'}</div></Card>
        <Card><div className="text-xs text-slate-500">퇴사일</div><div className="mt-2 font-semibold">{employee.resignation_date ?? '-'}</div></Card>
        <Card><div className="text-xs text-slate-500">로그인 연결</div><div className="mt-2 font-semibold">{employee.user_id ? '연결됨' : '미연결'}</div></Card>
      </div>

      <Card>
        <EmployeeForm action={action} value={employee} {...options} submitLabel="변경사항 저장" cancelHref="/employees" />
      </Card>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-semibold">빠른 재직상태 변경</div>
            <div className="mt-1 text-sm text-slate-500">
              퇴사 처리하면 관련 진단·평가 데이터에 퇴사자 표시가 자동 반영됩니다. 데이터는 삭제되지 않습니다.
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <form action={activeAction}><button className="rounded-xl border border-slate-300 px-4 py-2 text-sm">재직</button></form>
            <form action={leaveAction}><button className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-700">휴직</button></form>
            <form action={resignAction} className="flex items-end gap-2">
              <label className="text-xs font-semibold text-slate-600">
                퇴사일
                <input
                  type="date"
                  name="resignation_date"
                  required
                  defaultValue={employee.resignation_date ?? today}
                  className="mt-1 block rounded-xl border border-red-200 px-3 py-2 text-sm"
                />
              </label>
              <button className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">퇴사 처리</button>
            </form>
          </div>
        </div>
      </Card>

      <Card className="border-red-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-bold text-red-700">위험 영역 · 영구삭제</div>
            <div className="mt-1 max-w-3xl text-sm text-slate-500">
              직원 기본정보뿐 아니라 해당 직원의 진단·평가·관찰·성장 데이터와 해당 직원이 평가자로 작성한 평가까지 삭제합니다.
              다른 직원의 평가자/리더 지정에서는 해당 직원을 자동 해제합니다.
            </div>
          </div>
          <SingleEmployeeDeleteButton employeeId={id} employeeLabel={`${employee.employee_no} ${employee.name}`} />
        </div>
      </Card>
    </PageShell>
  );
}
