import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { EmployeeBulkDeleteTable, type EmployeeDeleteRow } from '@/components/hr/EmployeeDeleteControls';
import { requireHrAdmin } from '@/lib/hr/admin';
import { firstRelationName, stringParam } from '@/lib/hr/utils';

const statusLabel: Record<string,string> = { active: '재직', leave: '휴직', resigned: '퇴사' };

type EmployeeRow = {
  id: string;
  employee_no: string;
  name: string;
  email: string | null;
  hire_date: string;
  resignation_date: string | null;
  employment_status: string;
  employment_type: string;
  is_leader: boolean;
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

  let query = supabase
    .from('employees')
    .select('id,employee_no,name,email,hire_date,resignation_date,employment_status,employment_type,is_leader,departments(name),job_levels(name),positions(name)')
    .order('employee_no');

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

  const deleteRows: EmployeeDeleteRow[] = employees.map((e) => ({
    id: e.id,
    employee_no: e.employee_no,
    name: e.name,
    department_name: firstRelationName(e.departments) ?? '',
    job_level_name: firstRelationName(e.job_levels) ?? '',
    position_name: firstRelationName(e.positions) ?? '',
    hire_date: e.hire_date,
    resignation_date: e.resignation_date,
    employment_status: e.employment_status,
    is_leader: e.is_leader,
  }));

  return (
    <PageShell
      title="직원관리"
      description="직원 기본정보·퇴사일·재직상태를 관리하고, 선택 직원을 일괄 영구삭제할 수 있습니다."
    >
      <Notice success={success} error={errorMessage || error?.message} />

      <Card>
        <form className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto_auto]" method="get">
          <input name="q" defaultValue={q} placeholder="사번·이름·이메일 검색" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          <select name="department" defaultValue={departmentId} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
            <option value="">전체 부서</option>
            {departmentOptions.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <select name="job_level" defaultValue={jobLevelId} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
            <option value="">전체 직급</option>
            {jobLevelOptions.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <select name="status" defaultValue={status} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
            <option value="">전체 상태</option>
            {Object.entries(statusLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">검색</button>
          <div className="flex gap-2">
            <Link href="/employees/import" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-sm font-semibold text-emerald-800">Excel 일괄등록</Link>
            <Link href="/employees/new" className="rounded-xl bg-navy-900 px-4 py-2.5 text-center text-sm font-semibold text-white">+ 신규 등록</Link>
          </div>
        </form>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <span>총 {employees.length}명</span>
        <span className="text-red-500">영구삭제는 관련 진단·평가 데이터까지 삭제되며 복구할 수 없습니다.</span>
      </div>

      <Card className="overflow-hidden p-0">
        <EmployeeBulkDeleteTable rows={deleteRows} />
      </Card>
    </PageShell>
  );
}
