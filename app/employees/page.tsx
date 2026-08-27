import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { EmployeeStatusBadge } from '@/components/hr/StatusBadge';
import { Notice } from '@/components/hr/Notice';
import { requireHrAdmin } from '@/lib/hr/admin';
import { firstRelationName, stringParam } from '@/lib/hr/utils';

const statusLabel: Record<string,string> = { active: '재직', leave: '휴직', resigned: '퇴사' };

type EmployeeRow = {
  id: string; employee_no: string; name: string; email: string | null; hire_date: string;
  employment_status: string; employment_type: string; is_leader: boolean;
  departments: { name: string } | { name: string }[] | null;
  job_levels: { name: string } | { name: string }[] | null;
  positions: { name: string } | { name: string }[] | null;
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EmployeesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = stringParam(params.q);
  const departmentId = stringParam(params.department);
  const jobLevelId = stringParam(params.job_level);
  const status = stringParam(params.status);
  const success = stringParam(params.success);
  const errorMessage = stringParam(params.error);
  const { supabase } = await requireHrAdmin();

  let query = supabase.from('employees').select('id,employee_no,name,email,hire_date,employment_status,employment_type,is_leader,departments(name),job_levels(name),positions(name)').order('employee_no');
  if (q) query = query.or(`employee_no.ilike.%${q}%,name.ilike.%${q}%,email.ilike.%${q}%`);
  if (departmentId) query = query.eq('department_id', departmentId);
  if (jobLevelId) query = query.eq('job_level_id', jobLevelId);
  if (status) query = query.eq('employment_status', status);

  const [{ data: employeesData, error }, { data: departments }, { data: jobLevels }] = await Promise.all([
    query,
    supabase.from('departments').select('id,name').order('sort_order').order('name'),
    supabase.from('job_levels').select('id,name').order('level_order'),
  ]);
  const employees = (employeesData ?? []) as unknown as EmployeeRow[];
  const departmentOptions = (departments ?? []) as { id: string; name: string }[];
  const jobLevelOptions = (jobLevels ?? []) as { id: string; name: string }[];

  return (
    <PageShell title="직원관리" description="직원 기본정보와 조직·직급·직책·재직상태를 실제 DB에서 관리합니다.">
      <Notice success={success} error={errorMessage || error?.message} />
      <Card>
        <form className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto_auto]" method="get">
          <input name="q" defaultValue={q} placeholder="사번·이름·이메일 검색" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          <select name="department" defaultValue={departmentId} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">전체 부서</option>{departmentOptions.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <select name="job_level" defaultValue={jobLevelId} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">전체 직급</option>{jobLevelOptions.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <select name="status" defaultValue={status} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">전체 상태</option>{Object.entries(statusLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">검색</button>
          <Link href="/employees/new" className="rounded-xl bg-navy-900 px-4 py-2.5 text-center text-sm font-semibold text-white">+ 신규 등록</Link>
        </form>
      </Card>
      <div className="flex items-center justify-between text-sm text-slate-500"><span>총 {employees.length}명</span><span>행을 클릭하면 상세정보를 수정할 수 있습니다.</span></div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['사번','이름','부서','직급','직책','입사일','리더','상태',''].map((h)=><th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>{employees.map((e)=><tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/70">
            <td className="px-4 py-3 font-medium">{e.employee_no}</td><td className="px-4 py-3">{e.name}</td><td className="px-4 py-3">{firstRelationName(e.departments) ?? '-'}</td><td className="px-4 py-3">{firstRelationName(e.job_levels) ?? '-'}</td><td className="px-4 py-3">{firstRelationName(e.positions) ?? '-'}</td><td className="px-4 py-3">{e.hire_date}</td><td className="px-4 py-3">{e.is_leader ? 'Y' : '-'}</td><td className="px-4 py-3"><EmployeeStatusBadge status={e.employment_status}/></td><td className="px-4 py-3 text-right"><Link href={`/employees/${e.id}`} className="font-semibold text-blue-700">상세/수정</Link></td>
          </tr>)}</tbody>
        </table>
        {employees.length === 0 && <div className="py-14 text-center text-sm text-slate-500">조건에 맞는 직원이 없습니다.</div>}
      </Card>
    </PageShell>
  );
}
