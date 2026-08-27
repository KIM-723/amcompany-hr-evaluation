import { notFound } from 'next/navigation';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { EmployeeForm } from '@/components/hr/EmployeeForm';
import { EmployeeStatusBadge } from '@/components/hr/StatusBadge';
import { Notice } from '@/components/hr/Notice';
import { updateEmployee, setEmployeeStatus } from '@/app/employees/actions';
import { requireHrAdmin } from '@/lib/hr/admin';
import { loadEmployeeFormOptions } from '@/lib/hr/form-options';
import { firstRelationName, stringParam } from '@/lib/hr/utils';

type PageParams = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type EmployeeDetail = {
  id:string; employee_no:string; name:string; email:string|null; phone:string|null; hire_date:string;
  employment_status:string; employment_type:string; department_id:string|null; job_level_id:string|null; position_id:string|null;
  leader_id:string|null; is_leader:boolean; notes:string|null; resignation_date:string|null; user_id:string|null;
  departments:{name:string}|{name:string}[]|null; job_levels:{name:string}|{name:string}[]|null; positions:{name:string}|{name:string}[]|null;
};

export default async function EmployeeDetailPage({ params, searchParams }: { params: PageParams; searchParams: SearchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireHrAdmin();
  const [{ data }, options] = await Promise.all([
    supabase.from('employees').select('id,employee_no,name,email,phone,hire_date,employment_status,employment_type,department_id,job_level_id,position_id,leader_id,is_leader,notes,resignation_date,user_id,departments(name),job_levels(name),positions(name)').eq('id', id).maybeSingle(),
    loadEmployeeFormOptions(supabase),
  ]);
  const employee = data as unknown as EmployeeDetail | null;
  if (!employee) notFound();
  const current = employee as EmployeeDetail;
  const action = updateEmployee.bind(null, id);
  const activeAction = setEmployeeStatus.bind(null, id, 'active');
  const leaveAction = setEmployeeStatus.bind(null, id, 'leave');
  const resignAction = setEmployeeStatus.bind(null, id, 'resigned');

  return (
    <PageShell title={`${current.name} · ${current.employee_no}`} description="직원 상세정보와 조직/재직상태를 관리합니다.">
      <Notice success={stringParam(sp.success)} error={stringParam(sp.error)} />
      <div className="grid gap-4 lg:grid-cols-4">
        <Card><div className="text-xs text-slate-500">현재 상태</div><div className="mt-2"><EmployeeStatusBadge status={current.employment_status}/></div></Card>
        <Card><div className="text-xs text-slate-500">부서</div><div className="mt-2 font-semibold">{firstRelationName(current.departments) ?? '-'}</div></Card>
        <Card><div className="text-xs text-slate-500">직급 / 직책</div><div className="mt-2 font-semibold">{firstRelationName(current.job_levels) ?? '-'} / {firstRelationName(current.positions) ?? '-'}</div></Card>
        <Card><div className="text-xs text-slate-500">로그인 연결</div><div className="mt-2 font-semibold">{current.user_id ? '연결됨' : '미연결'}</div></Card>
      </div>
      <Card>
        <EmployeeForm action={action} value={current} {...options} submitLabel="변경사항 저장" cancelHref="/employees" />
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="font-semibold">빠른 재직상태 변경</div><div className="mt-1 text-sm text-slate-500">퇴사 처리 시 오늘 날짜가 퇴사일로 기록됩니다. 다시 재직 처리하면 퇴사일은 해제됩니다.</div></div>
          <div className="flex gap-2">
            <form action={activeAction}><button className="rounded-xl border border-slate-300 px-4 py-2 text-sm">재직</button></form>
            <form action={leaveAction}><button className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-700">휴직</button></form>
            <form action={resignAction}><button className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">퇴사</button></form>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
