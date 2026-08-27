import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { createDepartment, setDepartmentActive } from '@/app/organization/actions';
import { requireHrAdmin } from '@/lib/hr/admin';
import { stringParam } from '@/lib/hr/utils';

type Department = { id:string; name:string; code:string|null; parent_id:string|null; sort_order:number; is_active:boolean; description:string|null };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function DepartmentTree({ departments, parentId = null, depth = 0 }: { departments: Department[]; parentId?: string | null; depth?: number }) {
  const children = departments.filter((d)=>d.parent_id === parentId).sort((a,b)=>a.sort_order-b.sort_order || a.name.localeCompare(b.name,'ko'));
  if (children.length === 0) return null;
  return <div className={depth ? 'ml-5 border-l border-slate-200 pl-4' : ''}>{children.map((d)=><div key={d.id} className="mb-2">
    <div className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${d.is_active?'border-slate-200 bg-white':'border-slate-200 bg-slate-50 text-slate-400'}`}>
      <div><span className="font-semibold">{d.name}</span>{d.code && <span className="ml-2 text-xs text-slate-400">{d.code}</span>}</div>
      <Link href={`/organization/departments/${d.id}`} className="text-xs font-semibold text-blue-700">수정</Link>
    </div>
    <DepartmentTree departments={departments} parentId={d.id} depth={depth+1}/>
  </div>)}</div>;
}

export default async function OrganizationPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { supabase } = await requireHrAdmin();
  const [{ data: departmentsData }, { count: employeeCount }] = await Promise.all([
    supabase.from('departments').select('id,name,code,parent_id,sort_order,is_active,description').order('sort_order').order('name'),
    supabase.from('employees').select('*', { count: 'exact', head: true }).neq('employment_status','resigned'),
  ]);
  const departments = (departmentsData ?? []) as Department[];
  return <PageShell title="조직관리" description="부서를 계층형 조직 Tree로 관리하고 직급·직책 마스터를 운영합니다.">
    <Notice success={stringParam(sp.success)} error={stringParam(sp.error)} />
    <div className="grid gap-4 lg:grid-cols-3">
      <Card><div className="text-xs text-slate-500">전체 부서</div><div className="mt-1 text-2xl font-bold">{departments.length}</div></Card>
      <Card><div className="text-xs text-slate-500">활성 부서</div><div className="mt-1 text-2xl font-bold">{departments.filter((x)=>x.is_active).length}</div></Card>
      <Card><div className="text-xs text-slate-500">재직/휴직 구성원</div><div className="mt-1 text-2xl font-bold">{employeeCount ?? 0}</div></Card>
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">조직 Tree</h2><p className="mt-1 text-xs text-slate-500">상위/하위 부서 관계가 DB의 parent_id로 연결됩니다.</p></div><div className="flex gap-2"><Link href="/organization/job-levels" className="rounded-lg border px-3 py-2 text-xs font-semibold">직급관리</Link><Link href="/organization/positions" className="rounded-lg border px-3 py-2 text-xs font-semibold">직책관리</Link></div></div><DepartmentTree departments={departments}/></Card>
      <Card><h2 className="font-bold">새 부서 등록</h2><form action={createDepartment} className="mt-4 space-y-3">
        <label className="block text-sm font-medium">부서명 *<input name="name" required className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
        <label className="block text-sm font-medium">부서코드<input name="code" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
        <label className="block text-sm font-medium">상위부서<select name="parent_id" className="mt-1 w-full rounded-xl border px-3 py-2.5"><option value="">없음 (최상위)</option>{departments.filter((x)=>x.is_active).map((d)=><option value={d.id} key={d.id}>{d.name}</option>)}</select></label>
        <label className="block text-sm font-medium">정렬순서<input type="number" name="sort_order" defaultValue="0" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
        <label className="block text-sm font-medium">설명<textarea name="description" rows={3} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
        <button className="w-full rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">부서 등록</button>
      </form></Card>
    </div>
    <Card className="overflow-x-auto p-0"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3">부서</th><th className="px-4 py-3">코드</th><th className="px-4 py-3">상태</th><th className="px-4 py-3">정렬</th><th className="px-4 py-3"></th></tr></thead><tbody>{departments.map((d)=>{const action=setDepartmentActive.bind(null,d.id,!d.is_active);return <tr key={d.id} className="border-t"><td className="px-4 py-3 font-medium">{d.name}</td><td className="px-4 py-3">{d.code??'-'}</td><td className="px-4 py-3">{d.is_active?'활성':'비활성'}</td><td className="px-4 py-3">{d.sort_order}</td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><Link href={`/organization/departments/${d.id}`} className="rounded-lg border px-3 py-1.5 text-xs">수정</Link><form action={action}><button className="rounded-lg border px-3 py-1.5 text-xs">{d.is_active?'비활성화':'활성화'}</button></form></div></td></tr>})}</tbody></table></Card>
  </PageShell>;
}
